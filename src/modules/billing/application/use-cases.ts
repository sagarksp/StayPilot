import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { createHash } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";
import { formatAuditMoneyPaise, recordAuditEvent } from "@/modules/audit/application/events";
import type { DepositReportFilters, FinanceReportFilters, RecordPayment, ReversePaymentInput } from "./schemas";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}
function propertyScope(actor: OrganizationActor) {
  return actor.activePgIds;
}
function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function dayInTimezone(date: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(({ type, value }) => [type, value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}
function plusDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}
function monthlyDueDate(start: Date, billingDay: number, monthOffset: number) {
  const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthOffset, 1));
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), Math.min(billingDay, lastDay)));
}
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function reversalRequestHash(actor: OrganizationActor, paymentId: string, input: ReversePaymentInput) {
  return createHash("sha256").update(`${actor.organizationId}\n${actor.userId}\n${paymentId}\n${input.amountPaise}\n${input.reason}`).digest("hex");
}
function idempotentReversal(record: { publicId: string; amountPaise: bigint; requestHash: string | null }, requestHash: string) {
  if (record.requestHash !== requestHash) throw new Error("IDEMPOTENCY_KEY_REUSED");
  return { publicId: record.publicId, amountPaise: record.amountPaise, replayed: true };
}

export const billingUseCases = {
  async getDepositReport(actor: OrganizationActor, filters: DepositReportFilters) {
    assertStaff(actor);
    const allowed = propertyScope(actor);
    if (filters.propertyId && allowed && !allowed.includes(filters.propertyId)) throw new AccessDeniedError();
    const propertyWhere = {
      organization: { publicId: actor.organizationId },
      ...(allowed ? { publicId: { in: [...allowed] } } : {}),
      ...(filters.propertyId ? { publicId: filters.propertyId } : {}),
    };
    const properties = await prisma.property.findMany({
      where: propertyWhere,
      select: { publicId: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    if (filters.propertyId && !properties.some((property) => property.publicId === filters.propertyId)) throw new AccessDeniedError();

    const propertyIds = filters.propertyId ? [filters.propertyId] : allowed ? [...allowed] : undefined;
    const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
    const toExclusive = filters.to ? new Date(`${filters.to}T00:00:00.000Z`) : undefined;
    if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const dateRange = from || toExclusive ? {
      ...(from ? { gte: from } : {}),
      ...(toExclusive ? { lt: toExclusive } : {}),
    } : undefined;
    const ledgerWhere = {
      organization: { publicId: actor.organizationId },
      ...(propertyIds ? { OR: [
        { depositAccount: { property: { publicId: { in: propertyIds } } } },
        { reservation: { property: { publicId: { in: propertyIds } } } },
      ] } : {}),
    };

    const [accounts, unassignedTransactions, transactions] = await Promise.all([
      prisma.securityDepositAccount.findMany({
        where: {
          organization: { publicId: actor.organizationId },
          ...(propertyIds ? { property: { publicId: { in: propertyIds } } } : {}),
        },
        select: {
          status: true,
          requiredAmountPaise: true,
          transactions: { select: { amountPaise: true } },
        },
      }),
      prisma.securityDepositTransaction.findMany({
        where: {
          ...ledgerWhere,
          depositAccountId: null,
          reservationId: { not: null },
        },
        select: { amountPaise: true },
      }),
      prisma.securityDepositTransaction.findMany({
        where: {
          ...ledgerWhere,
          ...(filters.transactionType ? { transactionType: filters.transactionType } : {}),
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        select: {
          publicId: true,
          transactionType: true,
          amountPaise: true,
          description: true,
          transferReference: true,
          createdAt: true,
          payment: { select: { method: true, reference: true } },
          depositAccount: {
            select: {
              property: { select: { name: true } },
              residentStay: { select: { resident: { select: { name: true } } } },
            },
          },
          reservation: {
            select: {
              property: { select: { name: true } },
              resident: { select: { name: true } },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    const sum = (values: readonly bigint[]) => values.reduce((total, value) => total + value, BigInt(0));
    const unassignedHeldPaise = sum(unassignedTransactions.map((entry) => entry.amountPaise));
    const heldPaise = sum(accounts.map((account) => sum(account.transactions.map((entry) => entry.amountPaise)))) + unassignedHeldPaise;
    const requiredPaise = sum(accounts.filter((account) => account.status === "OPEN").map((account) => account.requiredAmountPaise));
    return {
      properties,
      totals: {
        heldPaise,
        requiredPaise,
        receivedPaise: sum(transactions.filter((entry) => entry.transactionType === "RECEIPT").map((entry) => entry.amountPaise)),
        refundedPaise: sum(transactions.filter((entry) => entry.transactionType === "REFUND").map((entry) => entry.amountPaise < BigInt(0) ? -entry.amountPaise : entry.amountPaise)),
        deductedPaise: sum(transactions.filter((entry) => entry.transactionType === "DEDUCTION").map((entry) => entry.amountPaise < BigInt(0) ? -entry.amountPaise : entry.amountPaise)),
        unassignedReservationPaise: unassignedHeldPaise,
      },
      rows: transactions.map((entry) => ({
        id: entry.publicId,
        date: entry.createdAt,
        type: entry.transactionType,
        propertyName: entry.depositAccount?.property.name ?? entry.reservation?.property.name ?? "—",
        residentName: entry.depositAccount?.residentStay.resident.name ?? entry.reservation?.resident.name ?? "—",
        reference: entry.transferReference ?? entry.payment?.reference ?? entry.description ?? "—",
        method: entry.payment?.method ?? "—",
        amountPaise: entry.amountPaise,
      })),
    };
  },

  async getFinanceReport(actor: OrganizationActor, filters: FinanceReportFilters) {
    assertStaff(actor);
    const allowed = propertyScope(actor);
    if (filters.propertyId && allowed && !allowed.includes(filters.propertyId)) throw new AccessDeniedError();
    const propertyWhere = {
      organization: { publicId: actor.organizationId },
      status: { not: "ARCHIVED" },
      ...(allowed ? { publicId: { in: [...allowed] } } : {}),
      ...(filters.propertyId ? { publicId: filters.propertyId } : {}),
    };
    const properties = await prisma.property.findMany({
      where: propertyWhere,
      select: { publicId: true, name: true },
      orderBy: { name: "asc" },
    });
    if (filters.propertyId && !properties.some((property) => property.publicId === filters.propertyId)) throw new AccessDeniedError();

    const propertyIds = filters.propertyId ? [filters.propertyId] : allowed ? [...allowed] : undefined;
    const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
    const toExclusive = filters.to ? new Date(`${filters.to}T00:00:00.000Z`) : undefined;
    if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const dateRange = from || toExclusive ? {
      ...(from ? { gte: from } : {}),
      ...(toExclusive ? { lt: toExclusive } : {}),
    } : undefined;
    const scopedProperty = propertyIds ? { property: { publicId: { in: propertyIds } } } : {};
    const organization = { organization: { publicId: actor.organizationId } };

    const [invoices, payments, deposits] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...organization,
          ...scopedProperty,
          status: { in: ["FINALIZED", "PARTIALLY_PAID", "PAID"] },
          ...(dateRange ? { issueDate: dateRange } : {}),
        },
        select: { totalPaise: true, adjustmentPaise: true, amountPaidPaise: true },
      }),
      prisma.payment.findMany({
        where: {
          ...organization,
          ...(propertyIds ? { property: { publicId: { in: propertyIds } } } : {}),
          ...(dateRange ? { paymentDate: dateRange } : {}),
          depositTransactions: { none: {} },
        },
        select: {
          publicId: true,
          paymentDate: true,
          transactionType: true,
          purpose: true,
          amountPaise: true,
          method: true,
          reference: true,
          recordedByName: true,
          property: { select: { name: true } },
          resident: { select: { name: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.securityDepositTransaction.findMany({
        where: {
          organization: { publicId: actor.organizationId },
          ...(propertyIds ? { OR: [
            { depositAccount: { property: { publicId: { in: propertyIds } } } },
            { reservation: { property: { publicId: { in: propertyIds } } } },
          ] } : {}),
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        select: {
          publicId: true,
          transactionType: true,
          amountPaise: true,
          description: true,
          createdAt: true,
          payment: { select: { method: true, reference: true } },
          depositAccount: {
            select: {
              property: { select: { name: true } },
              residentStay: { select: { resident: { select: { name: true } } } },
            },
          },
          reservation: {
            select: {
              property: { select: { name: true } },
              resident: { select: { name: true } },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);

    const sum = (values: readonly bigint[]) => values.reduce((total, value) => total + value, BigInt(0));
    const billedPaise = sum(invoices.map((invoice) => invoice.totalPaise + invoice.adjustmentPaise));
    const outstandingPaise = sum(invoices.map((invoice) => {
      const balance = invoice.totalPaise + invoice.adjustmentPaise - invoice.amountPaidPaise;
      return balance > BigInt(0) ? balance : BigInt(0);
    }));
    return {
      properties,
      totals: {
        billedPaise,
        collectedPaise: sum(payments.map((payment) => payment.amountPaise)),
        outstandingPaise,
        depositReceiptsPaise: sum(deposits.filter((entry) => entry.transactionType === "RECEIPT").map((entry) => entry.amountPaise)),
        depositRefundsPaise: sum(deposits.filter((entry) => entry.transactionType === "REFUND").map((entry) => entry.amountPaise < BigInt(0) ? -entry.amountPaise : entry.amountPaise)),
      },
      rows: [
        ...payments.map((payment) => ({
          id: payment.publicId,
          date: payment.paymentDate,
          type: `${payment.purpose} ${payment.transactionType}`,
          propertyName: payment.property.name,
          residentName: payment.resident.name,
          reference: payment.invoice?.invoiceNumber ?? payment.reference ?? "—",
          method: payment.method,
          amountPaise: payment.amountPaise,
        })),
        ...deposits.map((entry) => ({
          id: entry.publicId,
          date: entry.createdAt,
          type: `DEPOSIT ${entry.transactionType}`,
          propertyName: entry.depositAccount?.property.name ?? entry.reservation?.property.name ?? "—",
          residentName: entry.depositAccount?.residentStay.resident.name ?? entry.reservation?.resident.name ?? "—",
          reference: entry.description ?? entry.payment?.reference ?? "—",
          method: entry.payment?.method ?? "—",
          amountPaise: entry.amountPaise,
        })),
      ].sort((left, right) => right.date.getTime() - left.date.getTime()),
    };
  },

  async getOverview(actor: OrganizationActor) {
    assertStaff(actor);
    const propertyIds = propertyScope(actor);
    const scope = { organization: { publicId: actor.organizationId }, invoiceType: "RENT", ...(propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}) };
    const depositScope = { organization: { publicId: actor.organizationId }, status: "OPEN", ...(propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}) };
    const [draftRent, finalizedRent, collectedRent, requiredDeposit, receivedDeposit] = await Promise.all([
      prisma.invoice.aggregate({ where: { ...scope, status: "DRAFT" }, _sum: { totalPaise: true }, _count: true }),
      prisma.invoice.aggregate({ where: { ...scope, status: { in: ["FINALIZED", "PARTIALLY_PAID", "PAID"] } }, _sum: { totalPaise: true, adjustmentPaise: true }, _count: true }),
      prisma.payment.aggregate({ where: { invoice: { ...scope } }, _sum: { amountPaise: true } }),
      prisma.securityDepositAccount.aggregate({ where: depositScope, _sum: { requiredAmountPaise: true } }),
      prisma.securityDepositTransaction.aggregate({ where: { depositAccount: { ...depositScope } }, _sum: { amountPaise: true } }),
    ]);
    return { draftRent, finalizedRent, collectedRent, requiredDeposit, receivedDeposit };
  },

  async listInvoices(actor: OrganizationActor) {
    assertStaff(actor);
    const propertyIds = propertyScope(actor);
    return prisma.invoice.findMany({
      where: { organization: { publicId: actor.organizationId }, ...(propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}) },
      select: {
        publicId: true,
        invoiceNumber: true,
        status: true,
        billingPeriodStart: true,
        billingPeriodEnd: true,
        dueDate: true,
        totalPaise: true,
        adjustmentPaise: true,
        amountPaidPaise: true,
        finalizedAt: true,
        property: { select: { publicId: true, name: true } },
        residentStay: {
          select: {
            resident: { select: { publicId: true, name: true } },
            status: true,
            bed: { select: { label: true, room: { select: { number: true } } } },
          },
        },
        items: { select: { description: true, amountPaise: true } },
        payments: { select: { publicId: true, amountPaise: true, paymentDate: true, method: true, reference: true, notes: true, recordedByName: true, transactionType: true, originalPaymentId: true, purpose: true, depositTransactions: { select: { id: true } }, reversals: { where: { transactionType: "REVERSAL" }, select: { amountPaise: true } } }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }] },
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });
  },

  async recordPayment(actor: OrganizationActor, payment: RecordPayment) {
    assertStaff(actor);
    const scope = propertyScope(actor);
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          publicId: payment.invoiceId,
          organization: { publicId: actor.organizationId },
          ...(scope ? { property: { publicId: { in: [...scope] } } } : {}),
          status: { in: ["FINALIZED", "PARTIALLY_PAID"] },
        },
        select: { id: true, organizationId: true, propertyId: true, residentStayId: true, residentStay: { select: { residentId: true } }, totalPaise: true, adjustmentPaise: true, amountPaidPaise: true, status: true },
      });
      if (!invoice) throw new Error("INVOICE_NOT_PAYABLE");
      const effectiveTotal = invoice.totalPaise + invoice.adjustmentPaise;
      const balance = effectiveTotal - invoice.amountPaidPaise;
      if (payment.amountPaise > balance) throw new Error("PAYMENT_EXCEEDS_BALANCE");

      const nextPaid = invoice.amountPaidPaise + payment.amountPaise;
      const nextStatus = nextPaid >= effectiveTotal ? "PAID" : "PARTIALLY_PAID";
      const updated = await tx.invoice.updateMany({
        where: { id: invoice.id, amountPaidPaise: invoice.amountPaidPaise, adjustmentPaise: invoice.adjustmentPaise, status: invoice.status },
        data: { amountPaidPaise: nextPaid, status: nextStatus },
      });
      if (updated.count !== 1) throw new Error("INVOICE_CHANGED");

      const recorded = await tx.payment.create({
        data: {
          organizationId: invoice.organizationId,
          propertyId: invoice.propertyId,
          residentId: invoice.residentStay.residentId,
          residentStayId: invoice.residentStayId,
          invoiceId: invoice.id,
          purpose: "INVOICE",
          amountPaise: payment.amountPaise,
          paymentDate: payment.paymentDate,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          recordedByName: actor.userName,
        },
        select: { publicId: true, amountPaise: true },
      });
      await recordAuditEvent(tx, {
        organizationId: invoice.organizationId,
        propertyId: invoice.propertyId,
        actorUserPublicId: actor.userId,
        actorName: actor.userName,
        actionCode: "PAYMENT_RECORDED",
        entityType: "PAYMENT",
        entityPublicId: recorded.publicId,
        summary: `Recorded an invoice payment of ${formatAuditMoneyPaise(recorded.amountPaise)}.`,
      });
      return recorded;
    });
  },

  async reversePayment(actor: OrganizationActor, paymentId: string, input: ReversePaymentInput, idempotencyKey: string) {
    assertStaff(actor);
    if (idempotencyKey.length < 16 || idempotencyKey.length > 100) throw new Error("INVALID_IDEMPOTENCY_KEY");
    const requestHash = reversalRequestHash(actor, paymentId, input);
    const existing = await prisma.payment.findFirst({
      where: { organization: { publicId: actor.organizationId }, idempotencyKey },
      select: { publicId: true, amountPaise: true, requestHash: true },
    });
    if (existing) return idempotentReversal(existing, requestHash);

    const scope = propertyScope(actor);
    const organization = await prisma.organization.findUnique({ where: { publicId: actor.organizationId }, select: { id: true } });
    if (!organization) throw new Error("PAYMENT_NOT_REVERSIBLE");
    try {
      return await prisma.$transaction(async (tx) => {
        const lockedOriginal = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM payments WHERE public_id = ${paymentId} AND organization_id = ${organization.id} FOR UPDATE`;
        if (!lockedOriginal.length) throw new Error("PAYMENT_NOT_REVERSIBLE");
        const original = await tx.payment.findFirst({
          where: {
            publicId: paymentId,
            organization: { publicId: actor.organizationId },
            ...(scope ? { property: { publicId: { in: [...scope] } } } : {}),
            transactionType: "PAYMENT",
            purpose: "INVOICE",
            amountPaise: { gt: BigInt(0) },
          },
          select: {
            id: true,
            publicId: true,
            organizationId: true,
            propertyId: true,
            residentId: true,
            residentStayId: true,
            invoiceId: true,
            purpose: true,
            amountPaise: true,
            method: true,
            reference: true,
            depositTransactions: { select: { id: true } },
            residentStay: { select: { status: true } },
          },
        });
        if (!original || !original.invoiceId || !original.residentStayId || !original.residentStay) throw new Error("PAYMENT_NOT_REVERSIBLE");

        const retry = await tx.payment.findFirst({
          where: { organizationId: original.organizationId, idempotencyKey },
          select: { publicId: true, amountPaise: true, requestHash: true },
        });
        if (retry) return idempotentReversal(retry, requestHash);

        if (original.depositTransactions.length || original.residentStay.status === "COMPLETED") throw new Error("PAYMENT_NOT_REVERSIBLE");
        const previousReversals = await tx.payment.aggregate({
          where: { organizationId: original.organizationId, originalPaymentId: original.id, transactionType: "REVERSAL" },
          _sum: { amountPaise: true },
        });
        const alreadyReversed = -(previousReversals._sum.amountPaise ?? BigInt(0));
        const remainingReversible = original.amountPaise - alreadyReversed;
        if (input.amountPaise > remainingReversible) throw new Error("REVERSAL_EXCEEDS_UNREVERSED_AMOUNT");

        await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM invoices WHERE id = ${original.invoiceId} AND organization_id = ${original.organizationId} FOR UPDATE`;
        const invoice = await tx.invoice.findFirst({
          where: { id: original.invoiceId, organizationId: original.organizationId, status: { in: ["FINALIZED", "PARTIALLY_PAID", "PAID"] } },
          select: { id: true, totalPaise: true, adjustmentPaise: true, amountPaidPaise: true, status: true },
        });
        if (!invoice || input.amountPaise > invoice.amountPaidPaise) throw new Error("INVOICE_CHANGED");

        const nextPaid = invoice.amountPaidPaise - input.amountPaise;
        const effectiveTotal = invoice.totalPaise + invoice.adjustmentPaise;
        const nextStatus = nextPaid >= effectiveTotal ? "PAID" : nextPaid > BigInt(0) ? "PARTIALLY_PAID" : "FINALIZED";
        const changed = await tx.invoice.updateMany({
          where: { id: invoice.id, amountPaidPaise: invoice.amountPaidPaise, adjustmentPaise: invoice.adjustmentPaise, status: invoice.status },
          data: { amountPaidPaise: nextPaid, status: nextStatus },
        });
        if (changed.count !== 1) throw new Error("INVOICE_CHANGED");

        const reversal = await tx.payment.create({
          data: {
            organizationId: original.organizationId,
            propertyId: original.propertyId,
            residentId: original.residentId,
            residentStayId: original.residentStayId,
            invoiceId: original.invoiceId,
            transactionType: "REVERSAL",
            originalPaymentId: original.id,
            purpose: original.purpose,
            amountPaise: -input.amountPaise,
            paymentDate: dateOnly(new Date()),
            method: original.method,
            reference: original.reference,
            notes: input.reason,
            idempotencyKey,
            requestHash,
            recordedByName: actor.userName,
          },
          select: { publicId: true, amountPaise: true },
        });
        await recordAuditEvent(tx, {
          organizationId: original.organizationId,
          propertyId: original.propertyId,
          actorUserPublicId: actor.userId,
          actorName: actor.userName,
          actionCode: "PAYMENT_REVERSED",
          entityType: "PAYMENT",
          entityPublicId: reversal.publicId,
          summary: `Reversed ${formatAuditMoneyPaise(input.amountPaise)} from payment ${original.publicId}. Reason: ${input.reason}`,
        });
        return { ...reversal, replayed: false };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        const replay = await prisma.payment.findFirst({
          where: { organization: { publicId: actor.organizationId }, idempotencyKey },
          select: { publicId: true, amountPaise: true, requestHash: true },
        });
        if (replay) return idempotentReversal(replay, requestHash);
      }
      throw error;
    }
  },

  async finalize(actor: OrganizationActor, invoiceId: string) {
    assertStaff(actor);
    const scope = propertyScope(actor);
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { publicId: invoiceId, organization: { publicId: actor.organizationId }, ...(scope ? { property: { publicId: { in: [...scope] } } } : {}), status: "DRAFT" },
        select: { id: true, publicId: true, organizationId: true, propertyId: true, items: { select: { amountPaise: true } } },
      });
      if (!invoice || !invoice.items.length) throw new Error("INVOICE_NOT_DRAFT");
      const total = invoice.items.reduce((sum, item) => sum + item.amountPaise, BigInt(0));
      const result = await tx.invoice.updateMany({
        where: { id: invoice.id, status: "DRAFT" },
        data: { subtotalPaise: total, totalPaise: total, status: "FINALIZED", finalizedAt: new Date() },
      });
      if (result.count !== 1) throw new Error("INVOICE_NOT_DRAFT");
      await recordAuditEvent(tx, {
        organizationId: invoice.organizationId,
        propertyId: invoice.propertyId,
        actorUserPublicId: actor.userId,
        actorName: actor.userName,
        actionCode: "INVOICE_FINALIZED",
        entityType: "INVOICE",
        entityPublicId: invoice.publicId,
        summary: "Finalized an invoice for resident review.",
      });
    });
  },

  async generateDueDrafts(now = new Date()) {
    const orgs = await prisma.organization.findMany({ where: { status: "ACTIVE" }, select: { id: true, publicId: true, timezone: true } });
    let generated = 0;
    for (const org of orgs) {
      const issueDate = dayInTimezone(now, org.timezone);
      const dueDate = plusDays(issueDate, 5);
      const stays = await prisma.residentStay.findMany({
        where: { organizationId: org.id, status: "ACTIVE", startDate: { lte: dueDate }, rentRates: { some: { effectiveFrom: { lte: dueDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: dueDate } }] } } },
        select: { id: true, publicId: true, organizationId: true, propertyId: true, startDate: true, resident: { select: { name: true } }, rentRates: { where: { effectiveFrom: { lte: dueDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: dueDate } }] }, orderBy: { effectiveFrom: "desc" }, take: 1 } },
      });
      for (const stay of stays) {
        const rate = stay.rentRates[0];
        if (!rate) continue;
        const billingDay = rate.billingCycleType === "MOVE_IN_DAY" ? stay.startDate.getUTCDate() : rate.billingDay;
        if (!billingDay || monthlyDueDate(dueDate, billingDay, 0).getTime() !== dueDate.getTime()) continue;
        const nextDue = monthlyDueDate(dueDate, billingDay, 1);
        const periodEnd = plusDays(nextDue, -1);
        const invoiceNumber = `INV-${dueDate.getUTCFullYear()}${String(dueDate.getUTCMonth() + 1).padStart(2, "0")}-${stay.publicId.toUpperCase()}`;
        try {
          await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({ data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, invoiceNumber, invoiceType: "RENT", billingPeriodStart: dateOnly(dueDate), billingPeriodEnd: dateOnly(periodEnd), issueDate: dateOnly(issueDate), dueDate: dateOnly(dueDate), subtotalPaise: rate.amountPaise, totalPaise: rate.amountPaise, status: "DRAFT", items: { create: { itemType: "RENT", description: `Monthly rent — ${stay.resident.name} (${iso(dueDate)} to ${iso(periodEnd)})`, quantity: 1, unitAmountPaise: rate.amountPaise, amountPaise: rate.amountPaise } } }, select: { id: true } });
            return invoice.id;
          });
          generated++;
        } catch (error) {
          if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
        }
      }
    }
    return generated;
  },
};
