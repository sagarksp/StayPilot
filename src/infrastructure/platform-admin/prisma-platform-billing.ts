import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { Prisma } from "@/generated/prisma/client";

const zero = "0.00";

export async function getPlatformBilling() {
  const [settings, invoices, confirmedPayments, openInvoices] = await Promise.all([
    prisma.platformBillingSettings.findUnique({ where: { id: 1 } }),
    prisma.platformInvoice.findMany({
      include: {
        organization: { select: { publicId: true, name: true, status: true, memberships: { where: { status: "ACTIVE", roles: { some: { roleCode: "OWNER" } } }, select: { user: { select: { email: true } } }, take: 1 } } },
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 150,
    }),
    prisma.platformPayment.findMany({ where: { status: "CONFIRMED" }, select: { amount: true, invoice: { select: { currency: true } } } }),
    prisma.platformInvoice.findMany({ where: { status: "OPEN" }, include: { payments: { where: { status: "CONFIRMED" }, select: { amount: true } } } }),
  ]);
  const revenueByCurrency = new Map<string, Prisma.Decimal>();
  for (const payment of confirmedPayments) revenueByCurrency.set(payment.invoice.currency, (revenueByCurrency.get(payment.invoice.currency) ?? new Prisma.Decimal(0)).plus(payment.amount));
  const outstandingByCurrency = new Map<string, Prisma.Decimal>();
  for (const invoice of openInvoices) {
    const received = invoice.payments.reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    outstandingByCurrency.set(invoice.currency, (outstandingByCurrency.get(invoice.currency) ?? new Prisma.Decimal(0)).plus(invoice.totalAmount.minus(received)));
  }
  return {
    settings: settings ? { currency: settings.currency, monthlyRate: settings.monthlyRate.toString() } : { currency: "INR", monthlyRate: zero },
    invoices: invoices.map((invoice) => ({
      id: invoice.publicId,
      organizationId: invoice.organization.publicId,
      organization: invoice.organization.name,
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
  };
}

export async function updatePlatformPricing(input: { currency: string; monthlyRate: string; updatedByEmail: string }) {
  return prisma.platformBillingSettings.upsert({
    where: { id: 1 },
    create: { id: 1, currency: input.currency, monthlyRate: input.monthlyRate, updatedByEmail: input.updatedByEmail, updatedAt: new Date() },
    update: { currency: input.currency, monthlyRate: input.monthlyRate, updatedByEmail: input.updatedByEmail },
  });
}

export async function generatePlatformInvoices(period: string) {
  const settings = await prisma.platformBillingSettings.findUnique({ where: { id: 1 } });
  if (!settings || settings.monthlyRate.lessThanOrEqualTo(0)) throw new Error("PRICING_NOT_CONFIGURED");
  const [year, month] = period.split("-").map(Number);
  if (!year || month < 1 || month > 12) throw new Error("INVALID_PERIOD");
  const organizations = await prisma.organization.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, _count: { select: { properties: { where: { status: "ACTIVE" } } } } },
  });
  const invoiceRows = organizations.filter((organization) => organization._count.properties > 0).map((organization) => ({
    organizationId: organization.id,
    period,
    activePgCount: organization._count.properties,
    monthlyRate: settings.monthlyRate,
    currency: settings.currency,
    totalAmount: settings.monthlyRate.mul(organization._count.properties),
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
    include: { payments: { orderBy: { createdAt: "desc" } } },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });
  return invoices.map((invoice) => ({
    id: invoice.publicId, period: invoice.period, activePgCount: invoice.activePgCount,
    monthlyRate: invoice.monthlyRate.toString(), currency: invoice.currency, totalAmount: invoice.totalAmount.toString(),
    status: invoice.status, dueAt: invoice.dueAt,
    payments: invoice.payments.map((payment) => ({ id: payment.publicId, amount: payment.amount.toString(), method: payment.method, reference: payment.reference, paidAt: payment.paidAt, status: payment.status, note: payment.note })),
  }));
}
