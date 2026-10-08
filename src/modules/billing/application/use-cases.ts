import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { prisma } from "@/infrastructure/db/prisma";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}
function propertyScope(actor: OrganizationActor) {
  return actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds;
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

export const billingUseCases = {
  async getOverview(actor: OrganizationActor) {
    assertStaff(actor);
    const propertyIds = propertyScope(actor);
    const scope = { organization: { publicId: actor.organizationId }, invoiceType: "RENT", ...(propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}) };
    const [draftRent, finalizedRent] = await Promise.all([
      prisma.invoice.aggregate({ where: { ...scope, status: "DRAFT" }, _sum: { totalPaise: true }, _count: true }),
      prisma.invoice.aggregate({ where: { ...scope, status: "FINALIZED" }, _sum: { totalPaise: true }, _count: true }),
    ]);
    return { draftRent, finalizedRent };
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
        finalizedAt: true,
        property: { select: { publicId: true, name: true } },
        residentStay: {
          select: {
            resident: { select: { publicId: true, name: true } },
            bed: { select: { label: true, room: { select: { number: true } } } },
          },
        },
        items: { select: { description: true, amountPaise: true } },
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });
  },

  async finalize(actor: OrganizationActor, invoiceId: string) {
    assertStaff(actor);
    const scope = propertyScope(actor);
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { publicId: invoiceId, organization: { publicId: actor.organizationId }, ...(scope ? { property: { publicId: { in: [...scope] } } } : {}), status: "DRAFT" },
        select: { id: true, items: { select: { amountPaise: true } } },
      });
      if (!invoice || !invoice.items.length) throw new Error("INVOICE_NOT_DRAFT");
      const total = invoice.items.reduce((sum, item) => sum + item.amountPaise, BigInt(0));
      const result = await tx.invoice.updateMany({
        where: { id: invoice.id, status: "DRAFT" },
        data: { subtotalPaise: total, totalPaise: total, status: "FINALIZED", finalizedAt: new Date() },
      });
      if (result.count !== 1) throw new Error("INVOICE_NOT_DRAFT");
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
