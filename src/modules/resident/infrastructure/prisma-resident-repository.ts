import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import {
  ResidentWorkflowError,
  type AvailableBed,
  type CurrentBedAssignment,
  type ResidentDetail,
  type ResidentStaySummary,
  type ResidentSummary,
} from "../domain/resident";
import type { ResidentRepository } from "../application/repository";
import type {
  AssignResidentBedData,
  CheckOutResidentData,
  CreateResidentData,
} from "../application/schemas";
import type { RentTerms } from "@/modules/billing/application/schemas";

const staySelect = {
  publicId: true,
  property: { select: { publicId: true, name: true } },
  bed: {
    select: {
      publicId: true,
      label: true,
      room: {
        select: {
          number: true,
          floor: { select: { name: true } },
        },
      },
    },
  },
  startDate: true,
  endDate: true,
  status: true,
  rentRates: {
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
    take: 1,
    select: { amountPaise: true, billingCycleType: true, billingDay: true },
  },
} satisfies Prisma.ResidentStaySelect;

type StayRecord = Prisma.ResidentStayGetPayload<{ select: typeof staySelect }>;

function toStaySummary(stay: StayRecord): ResidentStaySummary {
  return {
    id: stay.publicId,
    propertyId: stay.property.publicId,
    propertyName: stay.property.name,
    bedId: stay.bed.publicId,
    bedLabel: stay.bed.label,
    roomNumber: stay.bed.room.number,
    floorName: stay.bed.room.floor.name,
    startDate: stay.startDate,
    endDate: stay.endDate,
    status: stay.status as ResidentStaySummary["status"],
    rent: stay.rentRates[0] ? {
      amountPaise: stay.rentRates[0].amountPaise,
      billingCycleType: stay.rentRates[0].billingCycleType as "MOVE_IN_DAY" | "FIXED_DAY",
      billingDay: stay.rentRates[0].billingDay,
    } : null,
  };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function managerPropertyFilter(propertyIds?: readonly string[]) {
  return propertyIds ? { publicId: { in: [...propertyIds] } } : {};
}

function operationalBedWhere(organizationId: string, propertyIds?: readonly string[]) {
  return {
    organization: { publicId: organizationId },
    status: "ACTIVE",
    property: {
      ...(propertyIds ? managerPropertyFilter(propertyIds) : {}),
      status: "ACTIVE",
    },
    room: { status: "ACTIVE" },
    floor: { status: "ACTIVE" },
  } satisfies Prisma.BedWhereInput;
}

async function findAssignableBed(
  db: Prisma.TransactionClient,
  organizationId: string,
  bedId: string,
  propertyIds?: readonly string[],
) {
  const bed = await db.bed.findFirst({
    where: {
      organization: { publicId: organizationId },
      publicId: bedId,
      status: "ACTIVE",
      property: {
        ...(propertyIds ? managerPropertyFilter(propertyIds) : {}),
        status: "ACTIVE",
      },
      room: { status: "ACTIVE" },
      floor: { status: "ACTIVE" },
      residentStays: { none: { status: "ACTIVE" } },
    },
    select: { id: true, organizationId: true, propertyId: true },
  });
  if (!bed) throw new ResidentWorkflowError("BED_UNAVAILABLE");
  return bed;
}

async function createStay(
  db: Prisma.TransactionClient,
  bed: { id: bigint; organizationId: bigint; propertyId: bigint },
  residentId: bigint,
  input: CreateResidentData | AssignResidentBedData,
) {
  const stay = await db.residentStay.create({
    data: {
      organizationId: bed.organizationId,
      propertyId: bed.propertyId,
      residentId,
      bedId: bed.id,
      startDate: dateOnly(input.startDate),
      status: "ACTIVE",
      activeBedSlot: 1,
      activeResidentSlot: 1,
    },
  });
  await db.stayRentRate.create({
    data: {
      organizationId: bed.organizationId,
      propertyId: bed.propertyId,
      residentStayId: stay.id,
      effectiveFrom: dateOnly(input.startDate),
      amountPaise: input.amountPaise,
      billingCycleType: input.billingCycleType,
      billingDay: input.billingDay,
    },
  });
}

export const prismaResidentRepository: ResidentRepository = {
  async listResidents(organizationId, propertyIds) {
    const stayScope = propertyIds ? { property: managerPropertyFilter(propertyIds) } : {};
    const rows = await prisma.resident.findMany({
      where: {
        organization: { publicId: organizationId },
        ...(propertyIds ? { OR: [{ stays: { some: stayScope } }, { reservations: { some: { property: managerPropertyFilter(propertyIds) } } }] } : {}),
      },
      select: {
        publicId: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        stays: {
          where: stayScope,
          select: staySelect,
          orderBy: [{ startDate: "desc" }, { id: "desc" }],
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map((row): ResidentSummary => {
      const stays = row.stays.map(toStaySummary);
      return {
        id: row.publicId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        createdAt: row.createdAt,
        currentStay: stays.find((stay) => stay.status === "ACTIVE") ?? null,
        latestStay: stays[0] ?? null,
      };
    });
  },

  async getResident(organizationId, residentId, propertyIds) {
    const stayScope = propertyIds ? { property: managerPropertyFilter(propertyIds) } : {};
    const row = await prisma.resident.findFirst({
      where: {
        organization: { publicId: organizationId },
        publicId: residentId,
        ...(propertyIds ? { OR: [{ stays: { some: stayScope } }, { reservations: { some: { property: managerPropertyFilter(propertyIds) } } }] } : {}),
      },
      select: {
        publicId: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        stays: {
          where: stayScope,
          select: staySelect,
          orderBy: [{ startDate: "desc" }, { id: "desc" }],
        },
      },
    });
    if (!row) return null;
    return {
      id: row.publicId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      stays: row.stays.map(toStaySummary),
    } satisfies ResidentDetail;
  },

  async listAvailableBeds(organizationId, propertyIds) {
    const rows = await prisma.bed.findMany({
      where: {
        ...operationalBedWhere(organizationId, propertyIds),
        residentStays: { none: { status: "ACTIVE" } },
      },
      select: {
        publicId: true,
        label: true,
        property: { select: { publicId: true, name: true } },
        room: { select: { number: true, floor: { select: { name: true } } } },
      },
      orderBy: [
        { property: { name: "asc" } },
        { floor: { number: "asc" } },
        { room: { number: "asc" } },
        { label: "asc" },
      ],
    });
    return rows.map((row): AvailableBed => ({
      id: row.publicId,
      propertyId: row.property.publicId,
      propertyName: row.property.name,
      floorName: row.room.floor.name,
      roomNumber: row.room.number,
      label: row.label,
    }));
  },

  async listCurrentAssignments(organizationId, propertyId) {
    const rows = await prisma.residentStay.findMany({
      where: {
        organization: { publicId: organizationId },
        property: { publicId: propertyId },
        status: "ACTIVE",
      },
      select: {
        startDate: true,
        bed: { select: { publicId: true } },
        resident: { select: { publicId: true, name: true } },
      },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
    });
    return rows.map((row): CurrentBedAssignment => ({
      bedId: row.bed.publicId,
      residentId: row.resident.publicId,
      residentName: row.resident.name,
      startDate: row.startDate,
    }));
  },

  async getOccupancy(organizationId, propertyIds) {
    const beds = operationalBedWhere(organizationId, propertyIds);
    const [activeBedCount, occupiedBedCount] = await Promise.all([
      prisma.bed.count({ where: beds }),
      prisma.residentStay.count({
        where: {
          organization: { publicId: organizationId },
          ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
          status: "ACTIVE",
          bed: {
            status: "ACTIVE",
            property: { status: "ACTIVE" },
            room: { status: "ACTIVE" },
            floor: { status: "ACTIVE" },
          },
        },
      }),
    ]);
    return { activeBedCount, occupiedBedCount };
  },

  async createResidentWithStay(organizationId, input: CreateResidentData, propertyIds) {
    return prisma.$transaction(async (tx) => {
      const bed = await findAssignableBed(tx, organizationId, input.bedId, propertyIds);
      const resident = await tx.resident.create({
        data: {
          organization: { connect: { publicId: organizationId } },
          name: input.name,
          phone: input.phone,
          ...(input.email ? { email: input.email } : {}),
        },
        select: { id: true, publicId: true },
      });
      await createStay(tx, bed, resident.id, input);
      return resident.publicId;
    });
  },

  async assignBed(organizationId, residentId, input: AssignResidentBedData, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findFirst({
        where: { organization: { publicId: organizationId }, publicId: residentId },
        select: { id: true, stays: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
      });
      if (!resident) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      if (resident.stays.length) throw new ResidentWorkflowError("ACTIVE_STAY_EXISTS");
      const bed = await findAssignableBed(tx, organizationId, input.bedId, propertyIds);
      await createStay(tx, bed, resident.id, input);
    });
  },

  async setRentTerms(organizationId, residentId, stayId, input: RentTerms, effectiveFrom, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const stay = await tx.residentStay.findFirst({
        where: {
          organization: { publicId: organizationId },
          resident: { publicId: residentId },
          publicId: stayId,
          status: "ACTIVE",
          ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
        },
        select: { id: true, organizationId: true, propertyId: true },
      });
      if (!stay) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const start = dateOnly(effectiveFrom);
      const previousEnd = new Date(start);
      previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
      await tx.stayRentRate.updateMany({ where: { residentStayId: stay.id, effectiveTo: null, effectiveFrom: { lt: start } }, data: { effectiveTo: previousEnd } });
      await tx.stayRentRate.upsert({
        where: { residentStayId_effectiveFrom: { residentStayId: stay.id, effectiveFrom: start } },
        create: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, effectiveFrom: start, amountPaise: input.amountPaise, billingCycleType: input.billingCycleType, billingDay: input.billingDay },
        update: { amountPaise: input.amountPaise, billingCycleType: input.billingCycleType, billingDay: input.billingDay },
      });
    });
  },

  async checkOut(organizationId, residentId, input: CheckOutResidentData, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const stay = await tx.residentStay.findFirst({
        where: {
          organization: { publicId: organizationId },
          publicId: input.stayId,
          resident: { publicId: residentId },
          ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
          status: "ACTIVE",
        },
        select: { id: true, startDate: true },
      });
      if (!stay) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const endDate = dateOnly(input.endDate);
      if (endDate < stay.startDate) throw new ResidentWorkflowError("MOVE_OUT_BEFORE_MOVE_IN");
      const result = await tx.residentStay.updateMany({
        where: { id: stay.id, status: "ACTIVE" },
        data: {
          status: "ENDED",
          endDate,
          activeBedSlot: null,
          activeResidentSlot: null,
        },
      });
      if (result.count !== 1) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
    });
  },
};
