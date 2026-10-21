import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { Prisma } from "@/generated/prisma/client";

const zero = "0.00";

export async function getPlatformBilling() {
  const now = new Date();
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const [settings, invoices, confirmedPayments, monthlyPayments, openInvoices] = await Promise.all([
    prisma.platformBillingSettings.findUnique({ where: { id: 1 } }),
    prisma.platformInvoice.findMany({
      include: {
        organization: { select: { publicId: true, name: true, status: true, memberships: { where: { status: "ACTIVE", roles: { some: { roleCode: "OWNER" } } }, select: { user: { select: { email: true } } }, take: 1 } } },
        property: { select: { publicId: true, name: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 150,
    }),
    prisma.platformPayment.findMany({ where: { status: "CONFIRMED" }, select: { amount: true, invoice: { select: { currency: true } } } }),
    prisma.platformPayment.findMany({ where: { status: "CONFIRMED", paidAt: { gte: chartStart } }, select: { amount: true, paidAt: true, invoice: { select: { currency: true } } } }),
    prisma.platformInvoice.findMany({ where: { status: "OPEN" }, include: { payments: { where: { status: "CONFIRMED" }, select: { amount: true } } } }),
  ]);
  const revenueByCurrency = new Map<string, Prisma.Decimal>();
  for (const payment of confirmedPayments) revenueByCurrency.set(payment.invoice.currency, (revenueByCurrency.get(payment.invoice.currency) ?? new Prisma.Decimal(0)).plus(payment.amount));
  const outstandingByCurrency = new Map<string, Prisma.Decimal>();
  for (const invoice of openInvoices) {
    const received = invoice.payments.reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    outstandingByCurrency.set(invoice.currency, (outstandingByCurrency.get(invoice.currency) ?? new Prisma.Decimal(0)).plus(invoice.totalAmount.minus(received)));
  }
  const periodKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date) };
  });
  const monthlyByCurrency = new Map<string, Map<string, Prisma.Decimal>>();
  for (const payment of monthlyPayments) {
    const currency = payment.invoice.currency;
    const period = `${payment.paidAt.getUTCFullYear()}-${String(payment.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const values = monthlyByCurrency.get(currency) ?? new Map<string, Prisma.Decimal>();
    values.set(period, (values.get(period) ?? new Prisma.Decimal(0)).plus(payment.amount));
    monthlyByCurrency.set(currency, values);
  }
  return {
    settings: settings ? { currency: settings.currency, monthlyRate: settings.monthlyRate.toString() } : { currency: "INR", monthlyRate: zero },
    invoices: invoices.map((invoice) => ({
      id: invoice.publicId,
      organizationId: invoice.organization.publicId,
      organization: invoice.organization.name,
      propertyId: invoice.property?.publicId ?? null,
      property: invoice.property?.name ?? null,
      ownerEmail: invoice.organization.memberships[0]?.user.email ?? "No owner email",
      organizationStatus: invoice.organization.status,
      period: invoice.period,
      activePgCount: invoice.activePgCount,
      monthlyRate: invoice.monthlyRate.toString(),
      currency: invoice.currency,
      totalAmount: invoice.totalAmount.toString(),
      status: invoice.status,
      dueAt: invoice.dueAt,
      createdAt: invoice.createdAt,
      payments: invoice.payments.map((payment) => ({
        id: payment.publicId,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference,
        paidAt: payment.paidAt,
        status: payment.status,
        submittedByEmail: payment.submittedByEmail,
        reviewedByEmail: payment.reviewedByEmail,
        note: payment.note,
      })),
    })),
    revenueByCurrency: [...revenueByCurrency].map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    outstandingByCurrency: [...outstandingByCurrency].map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    monthlyRevenue: [...monthlyByCurrency].map(([currency, values]) => ({
      currency,
      months: periodKeys.map(({ key, label }) => ({ period: key, label, amount: (values.get(key) ?? new Prisma.Decimal(0)).toFixed(2) })),
    })),
  };
}

export async function listPlatformBillingProperties() {
  return prisma.property.findMany({
    where: { status: "ACTIVE", organization: { status: "ACTIVE" } },
    select: { publicId: true, name: true, organization: { select: { publicId: true, name: true } } },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
}

export async function updatePlatformPricing(input: { currency: string; monthlyRate: string; updatedByEmail: string }) {
  return prisma.platformBillingSettings.upsert({
    where: { id: 1 },
    create: { id: 1, currency: input.currency, monthlyRate: input.monthlyRate, updatedByEmail: input.updatedByEmail, updatedAt: new Date() },
    update: { currency: input.currency, monthlyRate: input.monthlyRate, updatedByEmail: input.updatedByEmail },
  });
}

export async function generatePlatformInvoices(period: string, selectedPropertyIds?: readonly string[]) {
  const settings = await prisma.platformBillingSettings.findUnique({ where: { id: 1 } });
  if (!settings || settings.monthlyRate.lessThanOrEqualTo(0)) throw new Error("PRICING_NOT_CONFIGURED");
  const [year, month] = period.split("-").map(Number);
  if (!year || month < 1 || month > 12) throw new Error("INVALID_PERIOD");
  const selectedIds = selectedPropertyIds === undefined ? undefined : [...new Set(selectedPropertyIds)];
  if (selectedIds && !selectedIds.length) throw new Error("INVALID_PROPERTY_SELECTION");
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE", organization: { status: "ACTIVE" }, ...(selectedIds ? { publicId: { in: selectedIds } } : {}) },
    select: { id: true, organizationId: true, publicId: true },
  });
  if (selectedIds && properties.length !== selectedIds.length) throw new Error("PROPERTY_UNAVAILABLE");
  const legacyInvoices = await prisma.platformInvoice.findMany({ where: { period, propertyId: null }, select: { organizationId: true } });
  const legacyOrganizationIds = new Set(legacyInvoices.map(({ organizationId }) => organizationId.toString()));
  const invoiceRows = properties.filter(({ organizationId }) => !legacyOrganizationIds.has(organizationId.toString())).map((property) => ({
    organizationId: property.organizationId,
    propertyId: property.id,
    period,
    activePgCount: 1,
    monthlyRate: settings.monthlyRate,
    currency: settings.currency,
    totalAmount: settings.monthlyRate,
    status: "OPEN",
    dueAt: new Date(Date.UTC(year, month, 5)),
  }));
  const result = await prisma.platformInvoice.createMany({ data: invoiceRows, skipDuplicates: true });
  return result.count;
}

export async function submitPlatformPayment(input: {
  invoiceId: string; organizationId: bigint; email: string; amount: string; method: string; reference: string | null; paidAt: Date; note: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.platformInvoice.findFirst({ where: { publicId: input.invoiceId, organizationId: input.organizationId }, select: { id: true, status: true, totalAmount: true } });
    if (!invoice || invoice.status === "PAID") throw new Error("INVOICE_UNAVAILABLE");
    const outstandingPayments = await tx.platformPayment.aggregate({ where: { invoiceId: invoice.id, status: { in: ["PENDING", "CONFIRMED"] } }, _sum: { amount: true } });
    const submitted = outstandingPayments._sum.amount ?? new Prisma.Decimal(0);
    if (new Prisma.Decimal(input.amount).plus(submitted).greaterThan(invoice.totalAmount)) throw new Error("AMOUNT_EXCEEDS_BALANCE");
    return tx.platformPayment.create({ data: { invoiceId: invoice.id, amount: input.amount, method: input.method, reference: input.reference, paidAt: input.paidAt, note: input.note, submittedByEmail: input.email } });
  });
}

export async function reviewPlatformPayment(input: { paymentId: string; reviewerEmail: string; decision: "CONFIRMED" | "REJECTED"; note: string | null }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.platformPayment.findUnique({ where: { publicId: input.paymentId }, include: { invoice: true } });
    if (!payment || payment.status !== "PENDING") throw new Error("PAYMENT_UNAVAILABLE");
    if (input.decision === "CONFIRMED") {
      const confirmed = await tx.platformPayment.aggregate({ where: { invoiceId: payment.invoiceId, status: "CONFIRMED" }, _sum: { amount: true } });
      if (new Prisma.Decimal(confirmed._sum.amount ?? 0).plus(payment.amount).greaterThan(payment.invoice.totalAmount)) throw new Error("PAYMENT_EXCEEDS_BALANCE");
    }
    const updated = await tx.platformPayment.update({
      where: { id: payment.id },
      data: { status: input.decision, reviewedByEmail: input.reviewerEmail, reviewedAt: new Date(), ...(input.note ? { note: input.note } : {}) },
    });
    if (input.decision === "CONFIRMED") {
      const confirmed = await tx.platformPayment.aggregate({ where: { invoiceId: payment.invoiceId, status: "CONFIRMED" }, _sum: { amount: true } });
      if (new Prisma.Decimal(confirmed._sum.amount ?? 0).greaterThanOrEqualTo(payment.invoice.totalAmount)) {
        await tx.platformInvoice.update({ where: { id: payment.invoiceId }, data: { status: "PAID" } });
      }
    }
    return updated;
  });
}

export async function getOwnerPlatformBilling(organizationId: bigint) {
  const invoices = await prisma.platformInvoice.findMany({
    where: { organizationId },
    include: { property: { select: { name: true } }, payments: { orderBy: { createdAt: "desc" } } },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });
  return invoices.map((invoice) => ({
    id: invoice.publicId, period: invoice.period, activePgCount: invoice.activePgCount,
    property: invoice.property?.name ?? null,
    monthlyRate: invoice.monthlyRate.toString(), currency: invoice.currency, totalAmount: invoice.totalAmount.toString(),
    status: invoice.status, dueAt: invoice.dueAt,
    payments: invoice.payments.map((payment) => ({ id: payment.publicId, amount: payment.amount.toString(), method: payment.method, reference: payment.reference, paidAt: payment.paidAt, status: payment.status, note: payment.note })),
  }));
}
