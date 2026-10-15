import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import type { z } from "zod";
import type { billSchema, electricityReportFilterSchema, electricitySettingsSchema, meterSchema, meterStatusSchema, overrideSchema, readingSchema } from "./schemas";

type MeterInput = z.infer<typeof meterSchema>;
type ReadingInput = z.infer<typeof readingSchema>;
type MeterStatusInput = z.infer<typeof meterStatusSchema>;
type ElectricitySettingsInput = z.infer<typeof electricitySettingsSchema>;
type BillInput = z.infer<typeof billSchema>;
type OverrideInput = z.infer<typeof overrideSchema>;
type ElectricityReportFilters = z.infer<typeof electricityReportFilterSchema>;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const cents = (value: string) => {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
};
function staff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}
function propertyScope(actor: OrganizationActor) {
  return actor.roles.includes("OWNER") ? undefined : [...actor.allowedPgIds];
}
async function scopedProperty(actor: OrganizationActor, publicId: string) {
  staff(actor);
  const allowed = propertyScope(actor);
  if (allowed && !allowed.includes(publicId)) throw new AccessDeniedError();
  const property = await prisma.property.findFirst({ where: { publicId, organization: { publicId: actor.organizationId } }, select: { id: true, publicId: true } });
  if (!property) throw new AccessDeniedError();
  return property;
}
function overlapDays(start: Date, end: Date, periodStart: Date, periodEnd: Date) {
  const first = Math.max(start.getTime(), periodStart.getTime());
  const last = Math.min(end.getTime(), periodEnd.getTime());
  return first > last ? 0 : Math.floor((last - first) / 86400000) + 1;
}

export const electricityUseCases = {
  async getReport(actor: OrganizationActor, filters: ElectricityReportFilters) {
    staff(actor);
    const allowed = propertyScope(actor);
    if (filters.propertyId && allowed && !allowed.includes(filters.propertyId)) throw new AccessDeniedError();
    const properties = await prisma.property.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        status: { not: "ARCHIVED" },
        ...(allowed ? { publicId: { in: allowed } } : {}),
        ...(filters.propertyId ? { publicId: filters.propertyId } : {}),
      },
      select: { publicId: true, name: true },
      orderBy: { name: "asc" },
    });
    if (filters.propertyId && properties.length === 0) throw new AccessDeniedError();
    const bills = await prisma.electricityBill.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        property: { publicId: { in: properties.map((property) => property.publicId) } },
        ...(filters.from ? { periodEnd: { gte: day(filters.from) } } : {}),
        ...(filters.to ? { periodStart: { lte: day(filters.to) } } : {}),
      },
      select: {
        publicId: true,
        billingMode: true,
        periodStart: true,
        periodEnd: true,
        unitsConsumed: true,
        totalAmountPaise: true,
        status: true,
        property: { select: { publicId: true, name: true } },
        allocations: {
          select: {
            invoiceItem: {
              select: {
                invoice: { select: { status: true, totalPaise: true, adjustmentPaise: true, amountPaidPaise: true } },
              },
            },
          },
        },
      },
      orderBy: [{ periodStart: "desc" }, { periodEnd: "desc" }, { createdAt: "desc" }],
    });

    const rows = bills.map((bill) => {
      let collectedPaise = BigInt(0);
      let outstandingPaise = BigInt(0);
      let draftInvoicePaise = BigInt(0);
      for (const allocation of bill.allocations) {
        const invoice = allocation.invoiceItem?.invoice;
        if (!invoice) continue;
        if (invoice.status === "DRAFT") {
          draftInvoicePaise += invoice.totalPaise;
        } else if (["FINALIZED", "PARTIALLY_PAID", "PAID"].includes(invoice.status)) {
          collectedPaise += invoice.amountPaidPaise;
          const effectiveTotal = invoice.totalPaise + invoice.adjustmentPaise;
          outstandingPaise += effectiveTotal > invoice.amountPaidPaise
            ? effectiveTotal - invoice.amountPaidPaise
            : BigInt(0);
        }
      }
      return { ...bill, collectedPaise, outstandingPaise, draftInvoicePaise };
    });
    const totals = rows.reduce((sum, row) => ({
      billedPaise: sum.billedPaise + (row.status === "FINALIZED" ? row.totalAmountPaise : BigInt(0)),
      collectedPaise: sum.collectedPaise + row.collectedPaise,
      outstandingPaise: sum.outstandingPaise + row.outstandingPaise,
      draftBillsPaise: sum.draftBillsPaise + (row.status === "DRAFT" ? row.totalAmountPaise : BigInt(0)),
      draftInvoicesPaise: sum.draftInvoicesPaise + row.draftInvoicePaise,
    }), {
      billedPaise: BigInt(0), collectedPaise: BigInt(0), outstandingPaise: BigInt(0),
      draftBillsPaise: BigInt(0), draftInvoicesPaise: BigInt(0),
    });
    return { properties, rows, totals };
  },

  async getPageData(actor: OrganizationActor) {
    staff(actor);
    const allowed = propertyScope(actor);
    const properties = await prisma.property.findMany({
      where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", ...(allowed ? { publicId: { in: allowed } } : {}) },
      select: { id: true, publicId: true, name: true, settings: { select: { electricityMode: true, defaultElectricityRatePaise: true } }, floors: { where: { status: "ACTIVE" }, select: { publicId: true, name: true } }, rooms: { where: { status: "ACTIVE" }, select: { publicId: true, number: true, floorId: true } } }, orderBy: { name: "asc" },
    });
    const dbOrg = await prisma.organization.findUnique({ where: { publicId: actor.organizationId }, select: { id: true } });
    if (!dbOrg) return { properties, meters: [], readings: [], bills: [] };
    const propertyIds = properties.map((property) => property.id);
    const [meters, readings, bills] = await Promise.all([
      prisma.electricityMeter.findMany({ where: { organizationId: dbOrg.id, propertyId: { in: propertyIds } }, select: { publicId: true, meterNumber: true, scopeType: true, status: true, installedOn: true, retiredOn: true, property: { select: { publicId: true, name: true } }, room: { select: { publicId: true, number: true } }, floor: { select: { publicId: true, name: true } }, readings: { select: { id: true, readingValue: true, readingAt: true }, orderBy: { readingAt: "desc" }, take: 6 } }, orderBy: [{ property: { name: "asc" } }, { meterNumber: "asc" }] }),
      prisma.electricityMeterReading.findMany({ where: { organizationId: dbOrg.id, meter: { propertyId: { in: propertyIds } } }, select: { id: true, meterId: true, readingValue: true, readingAt: true, meter: { select: { publicId: true, meterNumber: true, propertyId: true } } }, orderBy: [{ meterId: "asc" }, { readingAt: "asc" }, { id: "asc" }] }),
      prisma.electricityBill.findMany({ where: { organizationId: dbOrg.id, propertyId: { in: propertyIds } }, select: { publicId: true, billingMode: true, periodStart: true, periodEnd: true, totalAmountPaise: true, status: true, unitsConsumed: true, property: { select: { name: true } }, meter: { select: { meterNumber: true } }, allocations: { select: { publicId: true, occupiedDays: true, calculatedAmountPaise: true, finalAmountPaise: true, overrideReason: true, residentStay: { select: { resident: { select: { name: true } }, bed: { select: { room: { select: { number: true } }, label: true } } } } } } }, orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }], take: 50 }),
    ]);
    return { properties, meters, readings, bills };
  },

  async createMeter(actor: OrganizationActor, input: MeterInput) {
    const property = await scopedProperty(actor, input.propertyId);
    const org = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const scope = input.scopeType === "ROOM"
      ? await prisma.room.findFirst({ where: { publicId: input.scopeId, organizationId: org.id, propertyId: property.id }, select: { id: true } })
      : await prisma.floor.findFirst({ where: { publicId: input.scopeId, organizationId: org.id, propertyId: property.id }, select: { id: true } });
    if (!scope) throw new Error("INVALID_METER_SCOPE");
    return prisma.electricityMeter.create({ data: { organizationId: org.id, propertyId: property.id, scopeType: input.scopeType, roomId: input.scopeType === "ROOM" ? scope.id : null, floorId: input.scopeType === "FLOOR" ? scope.id : null, meterNumber: input.meterNumber, installedOn: input.installedOn ? day(input.installedOn) : null } });
  },

  async updateSettings(actor: OrganizationActor, input: ElectricitySettingsInput) {
    const property = await scopedProperty(actor, input.propertyId);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const defaultElectricityRatePaise = input.defaultUnitRate ? cents(input.defaultUnitRate) : null;
    return prisma.pgSetting.upsert({
      where: { propertyId: property.id },
      create: { organizationId: organization.id, propertyId: property.id, electricityMode: input.electricityMode, defaultElectricityRatePaise },
      update: { electricityMode: input.electricityMode, defaultElectricityRatePaise },
    });
  },

  async recordReading(actor: OrganizationActor, input: ReadingInput) {
    staff(actor);
    const allowed = propertyScope(actor);
    const meter = await prisma.electricityMeter.findFirst({ where: { publicId: input.meterId, organization: { publicId: actor.organizationId }, status: "ACTIVE", ...(allowed ? { property: { publicId: { in: allowed } } } : {}) }, select: { id: true, organizationId: true, installedOn: true } });
    if (!meter) throw new AccessDeniedError();
    const readingDate = day(input.readingAt);
    const reading = new Prisma.Decimal(input.readingValue);
    if (meter.installedOn && readingDate < day(meter.installedOn.toISOString().slice(0, 10))) throw new Error("READING_BEFORE_INSTALL");
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    return prisma.$transaction(async (tx) => {
      const lockedMeter = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM electricity_meters WHERE id = ${meter.id} AND organization_id = ${meter.organizationId} AND status = 'ACTIVE' FOR UPDATE`;
      if (!lockedMeter.length) throw new AccessDeniedError();
      const duplicate = await tx.electricityMeterReading.findFirst({ where: { meterId: meter.id, readingAt: readingDate }, select: { id: true } });
      if (duplicate) throw new Error("READING_DATE_ALREADY_EXISTS");
      const prior = await tx.electricityMeterReading.findFirst({ where: { meterId: meter.id, readingAt: { lt: readingDate } }, orderBy: [{ readingAt: "desc" }, { id: "desc" }], select: { readingValue: true } });
      const next = await tx.electricityMeterReading.findFirst({ where: { meterId: meter.id, readingAt: { gt: readingDate } }, orderBy: [{ readingAt: "asc" }, { id: "asc" }], select: { readingValue: true } });
      if ((prior && reading.lessThan(prior.readingValue)) || (next && reading.greaterThan(next.readingValue))) throw new Error("READING_NOT_MONOTONIC");
      return tx.electricityMeterReading.create({ data: { organizationId: meter.organizationId, meterId: meter.id, readingValue: reading, readingAt: readingDate, recordedById: user.id } });
    });
  },

  async retireMeter(actor: OrganizationActor, input: MeterStatusInput) {
    staff(actor);
    const allowed = propertyScope(actor);
    const meter = await prisma.electricityMeter.findFirst({
      where: {
        publicId: input.meterId,
        organization: { publicId: actor.organizationId },
        status: "ACTIVE",
        ...(allowed ? { property: { publicId: { in: allowed } } } : {}),
      },
      select: { id: true },
    });
    if (!meter) throw new AccessDeniedError();
    const changed = await prisma.electricityMeter.updateMany({
      where: { id: meter.id, status: "ACTIVE" },
      data: { status: input.status, retiredOn: new Date() },
    });
    if (changed.count !== 1) throw new Error("METER_CHANGED");
  },

  async createBill(actor: OrganizationActor, input: BillInput) {
    const property = await scopedProperty(actor, input.propertyId);
    const org = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const start = day(input.periodStart), end = day(input.periodEnd);
    let meterId: bigint | null = null, previousReadingId: bigint | null = null, currentReadingId: bigint | null = null;
    let unitsConsumed: Prisma.Decimal | null = null, ratePaise: bigint | null = null, totalAmountPaise: bigint;
    if (input.billingMode === "MANUAL") {
      if (!input.totalAmount) throw new Error("INVALID_BILL_AMOUNT");
      const existingManualBill = await prisma.electricityBill.findFirst({ where: { organizationId: org.id, propertyId: property.id, billingMode: "MANUAL", periodStart: start, periodEnd: end }, select: { id: true } });
      if (existingManualBill) throw new Error("DUPLICATE_MANUAL_BILL");
      totalAmountPaise = cents(input.totalAmount);
    } else {
      if (!input.meterId || !input.previousReadingId || !input.currentReadingId || !input.unitRate) throw new Error("METER_READINGS_REQUIRED");
      const meter = await prisma.electricityMeter.findFirst({ where: { publicId: input.meterId, organizationId: org.id, propertyId: property.id, scopeType: input.billingMode === "ROOM_METER" ? "ROOM" : "FLOOR" }, select: { id: true, status: true, installedOn: true, retiredOn: true } });
      if (!meter) throw new Error("INVALID_METER");
      if (meter.installedOn && start < day(meter.installedOn.toISOString().slice(0, 10))) throw new Error("BILL_BEFORE_METER_INSTALL");
      if (meter.status !== "ACTIVE" && (!meter.retiredOn || end > day(meter.retiredOn.toISOString().slice(0, 10)))) throw new Error("BILL_AFTER_METER_RETIRE");
      const [previous, current] = await Promise.all([input.previousReadingId, input.currentReadingId].map((rowId) => prisma.electricityMeterReading.findFirst({ where: { id: BigInt(rowId), meterId: meter.id }, select: { id: true, readingValue: true, readingAt: true } })));
      if (!previous || !current || previous.id === current.id || previous.readingAt >= current.readingAt || previous.readingAt > start || current.readingAt < end || (meter.installedOn && previous.readingAt < day(meter.installedOn.toISOString().slice(0, 10))) || (meter.status !== "ACTIVE" && meter.retiredOn && current.readingAt > day(meter.retiredOn.toISOString().slice(0, 10))) || current.readingValue.lessThan(previous.readingValue)) throw new Error("INVALID_READING_RANGE");
      const consumedMilli = BigInt(current.readingValue.minus(previous.readingValue).mul(1000).toFixed(0));
      ratePaise = cents(input.unitRate);
      unitsConsumed = current.readingValue.minus(previous.readingValue);
      totalAmountPaise = (consumedMilli * ratePaise + BigInt(500)) / BigInt(1000);
      meterId = meter.id; previousReadingId = previous.id; currentReadingId = current.id;
    }
    if (totalAmountPaise <= BigInt(0)) throw new Error("INVALID_BILL_AMOUNT");
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    return prisma.electricityBill.create({ data: { organizationId: org.id, propertyId: property.id, billingMode: input.billingMode, meterId, previousReadingId, currentReadingId, unitsConsumed, unitRatePaise: ratePaise, totalAmountPaise, periodStart: start, periodEnd: end, createdById: user.id } });
  },

  async calculateAllocations(actor: OrganizationActor, billPublicId: string) {
    staff(actor);
    const allowed = propertyScope(actor);
    return prisma.$transaction(async (tx) => {
      const bill = await tx.electricityBill.findFirst({ where: { publicId: billPublicId, organization: { publicId: actor.organizationId }, status: "DRAFT", ...(allowed ? { property: { publicId: { in: allowed } } } : {}) }, select: { id: true, organizationId: true, propertyId: true, billingMode: true, meterId: true, periodStart: true, periodEnd: true, totalAmountPaise: true, meter: { select: { roomId: true, floorId: true } } } });
      if (!bill) throw new Error("BILL_NOT_DRAFT");
      const stays = await tx.residentStay.findMany({ where: { organizationId: bill.organizationId, propertyId: bill.propertyId, startDate: { lte: bill.periodEnd }, OR: [{ endDate: null }, { endDate: { gte: bill.periodStart } }], ...(bill.billingMode === "ROOM_METER" ? { bed: { roomId: bill.meter?.roomId ?? BigInt(-1) } } : bill.billingMode === "FLOOR_METER" ? { bed: { room: { floorId: bill.meter?.floorId ?? BigInt(-1) } } } : {}) }, select: { id: true, startDate: true, endDate: true }, orderBy: [{ startDate: "asc" }, { id: "asc" }] });
      const participants = stays.map((stay) => ({ stay, days: overlapDays(stay.startDate, stay.endDate ?? bill.periodEnd, bill.periodStart, bill.periodEnd) })).filter((entry) => entry.days > 0);
      if (!participants.length) throw new Error("NO_RESIDENTS_IN_PERIOD");
      const allDays = participants.reduce((sum, entry) => sum + entry.days, 0);
      const shares = participants.map((entry) => {
        const weightedTotal = bill.totalAmountPaise * BigInt(entry.days);
        return { ...entry, amount: weightedTotal / BigInt(allDays), remainder: weightedTotal % BigInt(allDays) };
      });
      const allocated = shares.reduce((sum, entry) => sum + entry.amount, BigInt(0));
      const remainingPaise = bill.totalAmountPaise - allocated;
      const remainderOrder = [...shares].sort((left, right) => {
        if (left.remainder !== right.remainder) return left.remainder > right.remainder ? -1 : 1;
        return left.stay.id < right.stay.id ? -1 : left.stay.id > right.stay.id ? 1 : 0;
      });
      for (let index = 0; index < Number(remainingPaise); index += 1) remainderOrder[index].amount += BigInt(1);
      await tx.electricityAllocation.deleteMany({ where: { electricityBillId: bill.id, invoiceItemId: null } });
      for (const entry of shares) {
        await tx.electricityAllocation.create({ data: { organizationId: bill.organizationId, electricityBillId: bill.id, residentStayId: entry.stay.id, occupiedDays: entry.days, calculatedAmountPaise: entry.amount, finalAmountPaise: entry.amount } });
      }
      return participants.length;
    });
  },

  async overrideAllocation(actor: OrganizationActor, input: OverrideInput) {
    staff(actor);
    const allowed = propertyScope(actor);
    const amountPaise = cents(input.amount);
    const target = await prisma.electricityAllocation.findFirst({ where: { publicId: input.allocationId, electricityBill: { status: "DRAFT", organization: { publicId: actor.organizationId }, ...(allowed ? { property: { publicId: { in: allowed } } } : {}) }, invoiceItemId: null }, select: { id: true } });
    if (!target) throw new Error("ALLOCATION_NOT_EDITABLE");
    return prisma.electricityAllocation.update({ where: { id: target.id }, data: { finalAmountPaise: amountPaise, overrideReason: input.reason, overriddenBy: { connect: { publicId: actor.userId } } } });
  },

  async finalizeBill(actor: OrganizationActor, billPublicId: string) {
    staff(actor);
    const allowed = propertyScope(actor);
    return prisma.$transaction(async (tx) => {
      const bill = await tx.electricityBill.findFirst({
        where: {
          publicId: billPublicId,
          organization: { publicId: actor.organizationId },
          status: "DRAFT",
          ...(allowed ? { property: { publicId: { in: allowed } } } : {}),
        },
        include: {
          allocations: {
            include: {
              residentStay: {
                select: {
                  id: true,
                  publicId: true,
                  resident: { select: { name: true } },
                },
              },
            },
          },
          property: { select: { name: true } },
        },
      });
      if (!bill || bill.allocations.length === 0) throw new Error("BILL_NEEDS_ALLOCATIONS");
      if (bill.allocations.some((allocation) => allocation.overrideReason === null && allocation.finalAmountPaise !== allocation.calculatedAmountPaise)) throw new Error("OVERRIDE_REASON_REQUIRED");
      const finalAllocationTotal = bill.allocations.reduce((sum, allocation) => sum + allocation.finalAmountPaise, BigInt(0));
      if (finalAllocationTotal !== bill.totalAmountPaise) throw new Error("ALLOCATION_TOTAL_MISMATCH");
      for (const allocation of bill.allocations) {
        const periodStart = bill.periodStart, periodEnd = bill.periodEnd;
        const issueDate = new Date(); issueDate.setUTCHours(0, 0, 0, 0);
        const invoiceNumber = `EL-${bill.publicId.slice(0, 8).toUpperCase()}-${allocation.residentStay.publicId.slice(0, 8).toUpperCase()}`;
        const invoice = await tx.invoice.create({ data: { organizationId: bill.organizationId, propertyId: bill.propertyId, residentStayId: allocation.residentStay.id, invoiceNumber, invoiceType: "ELECTRICITY", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, issueDate, dueDate: periodEnd, subtotalPaise: allocation.finalAmountPaise, totalPaise: allocation.finalAmountPaise, status: "DRAFT", items: { create: { itemType: "ELECTRICITY", description: `Electricity (${bill.property.name}, ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)})`, quantity: 1, unitAmountPaise: allocation.finalAmountPaise, amountPaise: allocation.finalAmountPaise } } }, select: { id: true, items: { select: { id: true }, take: 1 } } });
        await tx.electricityAllocation.update({ where: { id: allocation.id }, data: { invoiceItemId: invoice.items[0].id } });
      }
      const result = await tx.electricityBill.updateMany({ where: { id: bill.id, status: "DRAFT" }, data: { status: "FINALIZED", finalizedAt: new Date() } });
      if (result.count !== 1) throw new Error("BILL_NOT_DRAFT");
    });
  },
};
