import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { ReservationWorkflowError, type ReservationOverview, type ReservationSummary } from "../domain/reservation";
import type { ReservationRepository } from "../application/repository";
import type { CreateReservationData, ReservationReportFilters } from "../application/schemas";

const reservationSelect = {
  publicId: true, status: true, reservationDate: true, reservationStartDate: true,
  reservationEndDate: true, expectedMoveInDate: true, notes: true, cancellationReason: true, createdAt: true,
  resident: { select: { publicId: true, name: true, phone: true, email: true } },
  property: { select: { publicId: true, name: true } },
  bed: { select: { publicId: true, label: true, room: { select: { number: true, floor: { select: { name: true } } } } } },
  depositTransactions: { where: { depositAccountId: null }, select: { amountPaise: true } },
} satisfies Prisma.ReservationSelect;
type ReservationRecord = Prisma.ReservationGetPayload<{ select: typeof reservationSelect }>;
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
const liveStayStatuses = ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"];
function addMonths(value: Date, months: number) {
  if (months === 0) return null;
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(value.getUTCDate(), lastDay)));
}
const propertyFilter = (propertyIds?: readonly string[]) => propertyIds ? { publicId: { in: [...propertyIds] } } : {};
const activeInventory = (organizationId: string, propertyIds?: readonly string[]) => ({
  organization: { publicId: organizationId }, status: "ACTIVE", property: { ...propertyFilter(propertyIds), status: "ACTIVE" }, room: { status: "ACTIVE" }, floor: { status: "ACTIVE" },
});
function mapReservation(record: ReservationRecord): ReservationSummary {
  return {
    id: record.publicId, status: record.status as ReservationSummary["status"], residentId: record.resident.publicId,
    residentName: record.resident.name, residentPhone: record.resident.phone, residentEmail: record.resident.email,
    bed: { id: record.bed.publicId, propertyId: record.property.publicId, propertyName: record.property.name, floorName: record.bed.room.floor.name, roomNumber: record.bed.room.number, label: record.bed.label },
    reservationDate: record.reservationDate, reservationStartDate: record.reservationStartDate, reservationEndDate: record.reservationEndDate,
    expectedMoveInDate: record.expectedMoveInDate, notes: record.notes, cancellationReason: record.cancellationReason, createdAt: record.createdAt,
    prepaidSecurityDepositPaise: record.depositTransactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0)),
  };
}
function managerPropertyFilter(propertyIds?: readonly string[]) { return propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}; }
function managerResidentScope(propertyIds?: readonly string[]) {
  return propertyIds ? { OR: [
    { stays: { some: { property: { publicId: { in: [...propertyIds] } } } } },
    { reservations: { some: { property: { publicId: { in: [...propertyIds] } } } } },
  ] } : {};
}

export const prismaReservationRepository: ReservationRepository = {
  async listReservations(organizationId, propertyIds) {
    const records = await prisma.reservation.findMany({ where: { organization: { publicId: organizationId }, ...managerPropertyFilter(propertyIds) }, select: reservationSelect, orderBy: [{ status: "asc" }, { reservationStartDate: "asc" }, { createdAt: "desc" }] });
    return records.map(mapReservation);
  },
  async getReport(organizationId, propertyIds, filters: ReservationReportFilters) {
    if (filters.propertyId && propertyIds && !propertyIds.includes(filters.propertyId)) throw new AccessDeniedError();
    const properties = await prisma.property.findMany({
      where: {
        organization: { publicId: organizationId },
        status: "ACTIVE",
        ...(propertyIds ? { publicId: { in: [...propertyIds] } } : {}),
        ...(filters.propertyId ? { publicId: filters.propertyId } : {}),
      },
      select: { publicId: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    if (filters.propertyId && !properties.some((property) => property.publicId === filters.propertyId)) throw new AccessDeniedError();
    const from = filters.from ? dateOnly(filters.from) : undefined;
    const to = filters.to ? dateOnly(filters.to) : undefined;
    const records = await prisma.reservation.findMany({
      where: {
        organization: { publicId: organizationId },
        ...(filters.propertyId ? { property: { publicId: filters.propertyId } } : managerPropertyFilter(propertyIds)),
        ...(filters.status ? { status: filters.status } : {}),
        ...(from || to ? { AND: [
          ...(from ? [{ reservationEndDate: { gte: from } }] : []),
          ...(to ? [{ reservationStartDate: { lte: to } }] : []),
        ] } : {}),
      },
      select: {
        publicId: true,
        status: true,
        reservationDate: true,
        reservationStartDate: true,
        reservationEndDate: true,
        expectedMoveInDate: true,
        createdAt: true,
        resident: { select: { name: true } },
        property: { select: { name: true } },
        bed: { select: { label: true, room: { select: { number: true } } } },
        depositTransactions: { where: { transactionType: "RECEIPT" }, select: { amountPaise: true } },
      },
      orderBy: [{ reservationStartDate: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    const rows = records.map((record) => ({
      id: record.publicId,
      status: record.status,
      residentName: record.resident.name,
      propertyName: record.property.name,
      roomNumber: record.bed.room.number,
      bedLabel: record.bed.label,
      reservationDate: record.reservationDate,
      startDate: record.reservationStartDate,
      endDate: record.reservationEndDate,
      expectedMoveInDate: record.expectedMoveInDate,
      createdAt: record.createdAt,
      prepaidDepositPaise: record.depositTransactions.reduce((sum, entry) => sum + entry.amountPaise, BigInt(0)),
    }));
    const countStatus = (status: string) => records.filter((record) => record.status === status).length;
    return {
      properties,
      rows,
      totals: {
        total: rows.length,
        active: countStatus("ACTIVE"),
        movedIn: countStatus("MOVED_IN"),
        cancelled: countStatus("CANCELLED"),
        expired: countStatus("EXPIRED"),
        prepaidDepositPaise: rows.reduce((sum, row) => sum + row.prepaidDepositPaise, BigInt(0)),
      },
    };
  },
  async listCandidates(organizationId, propertyIds) {
    const [residents, beds] = await Promise.all([
      prisma.resident.findMany({ where: { organization: { publicId: organizationId }, stays: { none: { status: { in: liveStayStatuses } } }, reservations: { none: { status: "ACTIVE" } }, ...managerResidentScope(propertyIds) }, select: { publicId: true, name: true, phone: true }, orderBy: { name: "asc" } }),
      prisma.bed.findMany({ where: { ...activeInventory(organizationId, propertyIds), residentStays: { none: { status: { in: liveStayStatuses } } } }, select: { publicId: true, property: { select: { publicId: true, name: true } }, label: true, room: { select: { number: true, floor: { select: { name: true } } } } }, orderBy: [{ property: { name: "asc" } }, { room: { number: "asc" } }, { label: "asc" }] }),
    ]);
    return { residents: residents.map((resident) => ({ id: resident.publicId, name: resident.name, phone: resident.phone })), beds: beds.map((bed) => ({ id: bed.publicId, propertyId: bed.property.publicId, propertyName: bed.property.name, floorName: bed.room.floor.name, roomNumber: bed.room.number, label: bed.label })) };
  },
  async getOverview(organizationId, today, propertyIds): Promise<ReservationOverview> {
    const [activeCount, reservedBedCountToday] = await Promise.all([
      prisma.reservation.count({ where: { organization: { publicId: organizationId }, status: "ACTIVE", ...managerPropertyFilter(propertyIds) } }),
      prisma.reservation.count({ where: { organization: { publicId: organizationId }, status: "ACTIVE", reservationStartDate: { lte: dateOnly(today) }, reservationEndDate: { gte: dateOnly(today) }, ...managerPropertyFilter(propertyIds) } }),
    ]);
    return { activeCount, reservedBedCountToday };
  },
  async expireReservations(organizationId, today, propertyIds) {
    await prisma.reservation.updateMany({
      where: { organization: { publicId: organizationId }, status: "ACTIVE", reservationEndDate: { lt: dateOnly(today) }, ...managerPropertyFilter(propertyIds) },
      data: { status: "EXPIRED", expiredAt: new Date(), activeResidentSlot: null },
    });
  },
  async createReservation(organizationId, actorId, today, input: CreateReservationData, propertyIds) {
    return prisma.$transaction(async (tx) => {
      const [organization, actor, bed] = await Promise.all([
        tx.organization.findUnique({ where: { publicId: organizationId }, select: { id: true } }),
        tx.user.findUnique({ where: { publicId: actorId }, select: { id: true, name: true } }),
        tx.bed.findFirst({ where: { ...activeInventory(organizationId, propertyIds), publicId: input.bedId, residentStays: { none: { status: { in: liveStayStatuses } } } }, select: { id: true, organizationId: true, propertyId: true } }),
      ]);
      if (!organization || !actor) throw new Error("Reservation actor or organization not found");
      if (!bed) throw new ReservationWorkflowError("BED_UNAVAILABLE");
      await tx.$queryRaw`SELECT id FROM beds WHERE id = ${bed.id} FOR UPDATE`;
      const overlapping = await tx.reservation.findFirst({ where: { organizationId: organization.id, propertyId: bed.propertyId, bedId: bed.id, status: "ACTIVE", reservationStartDate: { lte: dateOnly(input.reservationEndDate) }, reservationEndDate: { gte: dateOnly(input.reservationStartDate) } }, select: { id: true } });
      if (overlapping) throw new ReservationWorkflowError("BED_UNAVAILABLE");
      if (!input.residentId && input.newResidentEmail) {
        const duplicate = await tx.resident.findFirst({ where: { organizationId: organization.id, email: input.newResidentEmail }, select: { id: true } });
        if (duplicate) throw new ReservationWorkflowError("RESIDENT_EMAIL_TAKEN");
      }
      const resident = input.residentId
        ? await tx.resident.findFirst({ where: { publicId: input.residentId, organization: { publicId: organizationId }, stays: { none: { status: { in: liveStayStatuses } } }, reservations: { none: { status: "ACTIVE" } }, ...managerResidentScope(propertyIds) }, select: { id: true } })
        : await tx.resident.create({
          data: { organizationId: organization.id, name: input.newResidentName!, phone: input.newResidentPhone!, email: input.newResidentEmail ?? null },
          select: { id: true },
        });
      if (!resident) throw new ReservationWorkflowError("RESIDENT_HAS_ACTIVE_STAY");
      const record = await tx.reservation.create({ data: {
        organizationId: bed.organizationId, propertyId: bed.propertyId, residentId: resident.id, bedId: bed.id,
        reservationDate: dateOnly(today), reservationStartDate: dateOnly(input.reservationStartDate), reservationEndDate: dateOnly(input.reservationEndDate),
        expectedMoveInDate: input.expectedMoveInDate ? dateOnly(input.expectedMoveInDate) : null, notes: input.notes ?? null,
        createdById: actor.id, activeResidentSlot: 1,
      }, select: { id: true, publicId: true } });
      if (input.securityDepositReceivedPaise > BigInt(0)) {
        const payment = await tx.payment.create({ data: {
          organizationId: bed.organizationId,
          propertyId: bed.propertyId,
          residentId: resident.id,
          reservationId: record.id,
          purpose: "SECURITY_DEPOSIT",
          amountPaise: input.securityDepositReceivedPaise,
          paymentDate: dateOnly(input.depositPaymentDate ?? today),
          method: input.depositPaymentMethod,
          reference: input.depositPaymentReference ?? null,
          notes: "Security deposit received with reservation",
          recordedByName: actor.name,
        }, select: { id: true } });
        await tx.securityDepositTransaction.create({ data: {
          organizationId: bed.organizationId,
          reservationId: record.id,
          paymentId: payment.id,
          transactionType: "RECEIPT",
          amountPaise: input.securityDepositReceivedPaise,
          description: "Security deposit received with reservation",
          createdById: actor.id,
        } });
      }
      return record.publicId;
    });
  },
  async cancelReservation(organizationId, actorId, reservationId, reason, propertyIds) {
    const actor = await prisma.user.findUnique({ where: { publicId: actorId }, select: { id: true } });
    if (!actor) throw new Error("Reservation actor not found");
    const record = await prisma.reservation.findFirst({ where: { publicId: reservationId, organization: { publicId: organizationId }, status: "ACTIVE", ...managerPropertyFilter(propertyIds) }, select: { id: true } });
    if (!record) throw new ReservationWorkflowError("RESERVATION_NOT_ACTIVE");
    await prisma.reservation.update({ where: { id: record.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id, cancellationReason: reason.trim() || null, activeResidentSlot: null } });
  },
  async moveIn(organizationId, reservationId, date, rent, deposit, propertyIds) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { publicId: reservationId, organization: { publicId: organizationId }, status: "ACTIVE", ...managerPropertyFilter(propertyIds) }, select: { id: true, organizationId: true, propertyId: true, residentId: true, resident: { select: { publicId: true } }, bedId: true, reservationStartDate: true, reservationEndDate: true } });
      if (!reservation) throw new ReservationWorkflowError("RESERVATION_NOT_ACTIVE");
      const moveInDate = dateOnly(date);
      if (moveInDate < reservation.reservationStartDate || moveInDate > reservation.reservationEndDate) throw new ReservationWorkflowError("MOVE_IN_OUTSIDE_RESERVATION");
      const bed = await tx.bed.findFirst({ where: { id: reservation.bedId, organizationId: reservation.organizationId, propertyId: reservation.propertyId, ...activeInventory(organizationId, propertyIds), residentStays: { none: { status: { in: liveStayStatuses } } } }, select: { id: true } });
      if (!bed) throw new ReservationWorkflowError("BED_UNAVAILABLE");
      const laterReservation = await tx.reservation.findFirst({ where: { id: { not: reservation.id }, organizationId: reservation.organizationId, propertyId: reservation.propertyId, bedId: reservation.bedId, status: "ACTIVE", reservationEndDate: { gte: moveInDate } }, select: { id: true } });
      if (laterReservation) throw new ReservationWorkflowError("BED_UNAVAILABLE");
      const prepaidDeposit = await tx.securityDepositTransaction.aggregate({ where: { reservationId: reservation.id, depositAccountId: null }, _sum: { amountPaise: true } });
      if ((prepaidDeposit._sum.amountPaise ?? BigInt(0)) > deposit.requiredAmountPaise) throw new ReservationWorkflowError("PREPAID_DEPOSIT_EXCEEDS_REQUIRED");
      const settings = await tx.pgSetting.findUnique({ where: { propertyId: reservation.propertyId }, select: { lockInMonths: true } });
      const lockInMonths = settings?.lockInMonths ?? 0;
      const stay = await tx.residentStay.create({ data: { organizationId: reservation.organizationId, propertyId: reservation.propertyId, residentId: reservation.residentId, bedId: reservation.bedId, reservationId: reservation.id, startDate: moveInDate, lockInMonths, lockInEndDate: addMonths(moveInDate, lockInMonths), status: "ACTIVE", activeBedSlot: 1, activeResidentSlot: 1 } });
      await tx.stayRentRate.create({ data: { organizationId: reservation.organizationId, propertyId: reservation.propertyId, residentStayId: stay.id, effectiveFrom: moveInDate, amountPaise: rent.amountPaise, billingCycleType: rent.billingCycleType, billingDay: rent.billingDay } });
      const depositAccount = await tx.securityDepositAccount.create({ data: { organizationId: reservation.organizationId, propertyId: reservation.propertyId, residentStayId: stay.id, requiredAmountPaise: deposit.requiredAmountPaise, policyType: deposit.depositPolicyType } });
      await tx.securityDepositTransaction.updateMany({ where: { reservationId: reservation.id, depositAccountId: null }, data: { depositAccountId: depositAccount.id } });
      await tx.payment.updateMany({ where: { reservationId: reservation.id, purpose: "SECURITY_DEPOSIT", residentStayId: null }, data: { residentStayId: stay.id } });
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "MOVED_IN", activeResidentSlot: null } });
      return reservation.resident.publicId;
    });
  },
};
