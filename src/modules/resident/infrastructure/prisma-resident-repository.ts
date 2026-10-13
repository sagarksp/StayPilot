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
  type DepositTransferAccountOption,
  type DepositTransferRecord,
} from "../domain/resident";
import type { ResidentRepository } from "../application/repository";
import type {
  AssignResidentBedData,
  CheckOutResidentData,
  CreateResidentData,
  MoveOutNoticeInput,
} from "../application/schemas";
import type { RentTerms } from "@/modules/billing/application/schemas";
import type { RecordSecurityDepositReceipt } from "@/modules/billing/application/schemas";

function staySelect(asOfDate: string) {
  const currentDate = dateOnly(asOfDate);
  return {
  publicId: true,
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
  lockInMonths: true,
  lockInEndDate: true,
  property: { select: { publicId: true, name: true, settings: { select: { noticePeriodDays: true } } } },
  checkoutProcesses: {
    where: { status: { in: ["NOTICE", "REVIEW", "SETTLEMENT_PENDING"] } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { noticeDate: true, requestedCheckoutDate: true, lockInOverride: true, lockInOverrideReason: true },
  },
  rentRates: {
    where: { effectiveFrom: { lte: currentDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: currentDate } }] },
    orderBy: { effectiveFrom: "desc" },
    take: 1,
    select: { amountPaise: true, billingCycleType: true, billingDay: true },
  },
  invoices: {
    select: {
      publicId: true,
      invoiceNumber: true,
      invoiceType: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
      dueDate: true,
      status: true,
      totalPaise: true,
      amountPaidPaise: true,
      items: { select: { description: true, quantity: true, unitAmountPaise: true, amountPaise: true }, orderBy: { id: "asc" } },
      payments: { select: { amountPaise: true, paymentDate: true, method: true, reference: true }, orderBy: { paymentDate: "asc" } },
    },
  },
    securityDepositAccount: {
      select: {
        requiredAmountPaise: true,
        policyType: true,
        status: true,
        transactions: {
          select: {
            publicId: true,
            transactionType: true,
            amountPaise: true,
            createdAt: true,
            description: true,
            payment: { select: { method: true, paymentDate: true, reference: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    },
  } satisfies Prisma.ResidentStaySelect;
}

type StayRecord = Prisma.ResidentStayGetPayload<{ select: ReturnType<typeof staySelect> }>;

const reservationSelect = {
  publicId: true,
  reservationStartDate: true,
  reservationEndDate: true,
  expectedMoveInDate: true,
  property: { select: { name: true } },
  bed: { select: { label: true, room: { select: { number: true } } } },
  depositTransactions: { where: { depositAccountId: null }, select: { amountPaise: true } },
} satisfies Prisma.ReservationSelect;
type ActiveReservationRecord = Prisma.ReservationGetPayload<{ select: typeof reservationSelect }>;

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
    lockInMonths: stay.lockInMonths,
    lockInEndDate: stay.lockInEndDate,
    noticePeriodDays: stay.property.settings?.noticePeriodDays ?? 30,
    checkoutNotice: stay.checkoutProcesses[0] ? {
      noticeDate: stay.checkoutProcesses[0].noticeDate,
      requestedCheckoutDate: stay.checkoutProcesses[0].requestedCheckoutDate,
      lockInOverride: stay.checkoutProcesses[0].lockInOverride,
      lockInOverrideReason: stay.checkoutProcesses[0].lockInOverrideReason,
    } : null,
    rent: stay.rentRates[0] ? {
      amountPaise: stay.rentRates[0].amountPaise,
      billingCycleType: stay.rentRates[0].billingCycleType as "MOVE_IN_DAY" | "FIXED_DAY",
      billingDay: stay.rentRates[0].billingDay,
    } : null,
    finalizedInvoiceDuePaise: stay.invoices.filter((invoice) => invoice.status === "FINALIZED" || invoice.status === "PARTIALLY_PAID").reduce((sum, invoice) => sum + invoice.totalPaise - invoice.amountPaidPaise, BigInt(0)),
    draftInvoiceCount: stay.invoices.filter((invoice) => invoice.status === "DRAFT").length,
    securityDeposit: stay.securityDepositAccount ? {
      requiredAmountPaise: stay.securityDepositAccount.requiredAmountPaise,
      policyType: stay.securityDepositAccount.policyType,
      status: stay.securityDepositAccount.status,
      balancePaise: stay.securityDepositAccount.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0)),
      transactions: stay.securityDepositAccount.transactions.map((transaction) => ({
        id: transaction.publicId,
        type: transaction.transactionType,
        amountPaise: transaction.amountPaise,
        createdAt: transaction.createdAt,
        description: transaction.description,
        method: transaction.payment?.method ?? null,
        paymentDate: transaction.payment?.paymentDate ?? null,
        reference: transaction.payment?.reference ?? null,
      })),
    } : null,
    invoices: stay.invoices.map((invoice) => ({
      id: invoice.publicId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      billingPeriodStart: invoice.billingPeriodStart,
      billingPeriodEnd: invoice.billingPeriodEnd,
      dueDate: invoice.dueDate,
      status: invoice.status,
      totalPaise: invoice.totalPaise,
      amountPaidPaise: invoice.amountPaidPaise,
      items: invoice.items.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitAmountPaise: item.unitAmountPaise, lineTotalPaise: item.amountPaise })),
      payments: invoice.payments,
    })),
  };
}

function toReservationSummary(reservation: ActiveReservationRecord) {
  return {
    id: reservation.publicId,
    startDate: reservation.reservationStartDate,
    endDate: reservation.reservationEndDate,
    expectedMoveInDate: reservation.expectedMoveInDate,
    propertyName: reservation.property.name,
    roomNumber: reservation.bed.room.number,
    bedLabel: reservation.bed.label,
    prepaidSecurityDepositPaise: reservation.depositTransactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0)),
  };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addMonths(value: Date, months: number) {
  if (months === 0) return null;
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + months;
  const targetFirst = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth(), Math.min(value.getUTCDate(), lastDay)));
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
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
      residentStays: { none: { status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] } } },
      reservations: { none: { status: "ACTIVE" } },
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
  const propertySettings = await db.pgSetting.findUnique({ where: { propertyId: bed.propertyId }, select: { lockInMonths: true } });
  const lockInMonths = propertySettings?.lockInMonths ?? 0;
  const startDate = dateOnly(input.startDate);
  const stay = await db.residentStay.create({
    data: {
      organizationId: bed.organizationId,
      propertyId: bed.propertyId,
      residentId,
      bedId: bed.id,
      startDate,
      lockInMonths,
      lockInEndDate: addMonths(startDate, lockInMonths),
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
  await db.securityDepositAccount.create({
    data: {
      organizationId: bed.organizationId,
      propertyId: bed.propertyId,
      residentStayId: stay.id,
      requiredAmountPaise: input.requiredAmountPaise,
      policyType: input.depositPolicyType,
    },
  });
}

export const prismaResidentRepository: ResidentRepository = {
  async listResidents(organizationId, asOfDate, propertyIds) {
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
          select: staySelect(asOfDate),
          orderBy: [{ startDate: "desc" }, { id: "desc" }],
        },
        reservations: { where: { status: "ACTIVE", ...managerPropertyFilter(propertyIds) }, select: reservationSelect, orderBy: { reservationStartDate: "asc" }, take: 1 },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map((row): ResidentSummary => {
      const stays = row.stays.map(toStaySummary);
      const reservation = row.reservations[0];
      return {
        id: row.publicId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        createdAt: row.createdAt,
        currentStay: reservation ? null : stays.find((stay) => ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"].includes(stay.status) && stay.startDate <= dateOnly(asOfDate) && (!stay.endDate || stay.endDate >= dateOnly(asOfDate))) ?? null,
        latestStay: stays[0] ?? null,
        currentReservation: reservation ? toReservationSummary(reservation) : null,
      };
    });
  },

  async listDepositTransferAccounts(organizationId, propertyIds): Promise<DepositTransferAccountOption[]> {
    const accounts = await prisma.securityDepositAccount.findMany({
      where: {
        organization: { publicId: organizationId },
        status: "OPEN",
        ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
      },
      select: {
        requiredAmountPaise: true,
        transactions: { select: { amountPaise: true } },
        residentStay: {
          select: {
            publicId: true,
            status: true,
            resident: { select: { name: true } },
            property: { select: { name: true } },
            bed: { select: { label: true, room: { select: { number: true } } } },
          },
        },
      },
      orderBy: [{ property: { name: "asc" } }, { residentStay: { resident: { name: "asc" } } }],
    });
    return accounts.map((account) => ({
      stayId: account.residentStay.publicId,
      residentName: account.residentStay.resident.name,
      propertyName: account.residentStay.property.name,
      roomNumber: account.residentStay.bed.room.number,
      bedLabel: account.residentStay.bed.label,
      stayStatus: account.residentStay.status,
      requiredAmountPaise: account.requiredAmountPaise,
      balancePaise: account.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0)),
    }));
  },

  async listDepositTransfers(organizationId, propertyIds): Promise<DepositTransferRecord[]> {
    const rows = await prisma.securityDepositTransaction.findMany({
      where: {
        organization: { publicId: organizationId },
        transferReference: { not: null },
        ...(propertyIds ? { depositAccount: { property: managerPropertyFilter(propertyIds) } } : {}),
      },
      select: {
        transferReference: true,
        transactionType: true,
        amountPaise: true,
        createdAt: true,
        description: true,
        depositAccount: { select: { property: { select: { name: true } }, residentStay: { select: { resident: { select: { name: true } } } } } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
    return rows.flatMap((row) => row.transferReference && row.depositAccount ? [{
      reference: row.transferReference,
      type: row.transactionType as DepositTransferRecord["type"],
      amountPaise: row.amountPaise,
      createdAt: row.createdAt,
      description: row.description,
      residentName: row.depositAccount.residentStay.resident.name,
      propertyName: row.depositAccount.property.name,
      recordedByName: row.createdBy.name,
    }] : []);
  },

  async getResident(organizationId, residentId, asOfDate, propertyIds) {
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
          select: staySelect(asOfDate),
          orderBy: [{ startDate: "desc" }, { id: "desc" }],
        },
        reservations: { where: { status: "ACTIVE", ...managerPropertyFilter(propertyIds) }, select: reservationSelect, orderBy: { reservationStartDate: "asc" }, take: 1 },
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
      currentReservation: row.reservations[0] ? toReservationSummary(row.reservations[0]) : null,
    } satisfies ResidentDetail;
  },

  async getResidentPortal(organizationId, userId, asOfDate) {
    const resident = await prisma.resident.findFirst({
      where: {
        organization: { publicId: organizationId },
        memberships: {
          some: {
            status: "ACTIVE",
            user: { publicId: userId, status: "ACTIVE" },
            roles: { some: { roleCode: "RESIDENT" } },
          },
        },
      },
      select: { publicId: true },
    });
    if (!resident) return null;
    return this.getResident(organizationId, resident.publicId, asOfDate);
  },

  async updateResidentEmail(organizationId, residentId, email, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findFirst({
        where: {
          organization: { publicId: organizationId },
          publicId: residentId,
          ...(propertyIds ? { stays: { some: { property: managerPropertyFilter(propertyIds) } } } : {}),
        },
        select: { id: true },
      });
      if (!resident) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const duplicate = await tx.resident.findFirst({
        where: { organization: { publicId: organizationId }, email, id: { not: resident.id } },
        select: { id: true },
      });
      if (duplicate) throw new ResidentWorkflowError("RESIDENT_EMAIL_TAKEN");
      await tx.resident.update({ where: { id: resident.id }, data: { email } });
    });
  },

  async listAvailableBeds(organizationId, propertyIds) {
    const rows = await prisma.bed.findMany({
      where: {
        ...operationalBedWhere(organizationId, propertyIds),
        residentStays: { none: { status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] } } },
        reservations: { none: { status: "ACTIVE" } },
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

  async listCurrentAssignments(organizationId, propertyId, asOfDate) {
    const rows = await prisma.residentStay.findMany({
      where: {
        organization: { publicId: organizationId },
        property: { publicId: propertyId },
        status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] },
      },
      select: {
        startDate: true,
        bed: { select: { publicId: true } },
        resident: { select: { publicId: true, name: true } },
        rentRates: { where: { effectiveFrom: { lte: dateOnly(asOfDate) }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateOnly(asOfDate) } }] }, orderBy: { effectiveFrom: "desc" }, take: 1, select: { amountPaise: true, billingCycleType: true, billingDay: true } },
      },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
    });
    return rows.map((row): CurrentBedAssignment => ({
      bedId: row.bed.publicId,
      residentId: row.resident.publicId,
      residentName: row.resident.name,
      startDate: row.startDate,
      monthlyRentPaise: row.rentRates[0]?.amountPaise ?? BigInt(0),
      billingCycleType: (row.rentRates[0]?.billingCycleType ?? "MOVE_IN_DAY") as CurrentBedAssignment["billingCycleType"],
      billingDay: row.rentRates[0]?.billingDay ?? null,
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
          status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] },
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
      if (input.email) {
        const duplicate = await tx.resident.findFirst({ where: { organization: { publicId: organizationId }, email: input.email }, select: { id: true } });
        if (duplicate) throw new ResidentWorkflowError("RESIDENT_EMAIL_TAKEN");
      }
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
        select: { id: true, stays: { where: { status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] } }, select: { id: true }, take: 1 }, reservations: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
      });
      if (!resident) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      if (resident.stays.length) throw new ResidentWorkflowError("ACTIVE_STAY_EXISTS");
      if (resident.reservations.length) throw new ResidentWorkflowError("ACTIVE_RESERVATION_EXISTS");
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

  async recordSecurityDepositReceipt(organizationId, actorId, actorName, residentId, stayId, input: RecordSecurityDepositReceipt, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const [actor, stay] = await Promise.all([
        tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } }),
        tx.residentStay.findFirst({ where: { organization: { publicId: organizationId }, resident: { publicId: residentId }, publicId: stayId, status: "ACTIVE", ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}) }, select: { id: true, organizationId: true, propertyId: true, residentId: true, securityDepositAccount: { select: { id: true, requiredAmountPaise: true, ledgerVersion: true, transactions: { select: { amountPaise: true } } } } } }),
      ]);
      if (!actor || !stay?.securityDepositAccount) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const account = stay.securityDepositAccount;
      const balance = account.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0));
      if (balance + input.amountPaise > account.requiredAmountPaise) throw new ResidentWorkflowError("DEPOSIT_EXCEEDS_REQUIRED");
      const locked = await tx.securityDepositAccount.updateMany({ where: { id: account.id, status: "OPEN", ledgerVersion: account.ledgerVersion }, data: { ledgerVersion: { increment: 1 } } });
      if (locked.count !== 1) throw new ResidentWorkflowError("DEPOSIT_ACCOUNT_CHANGED");
      const payment = await tx.payment.create({ data: {
        organizationId: stay.organizationId, propertyId: stay.propertyId, residentId: stay.residentId,
        residentStayId: stay.id, purpose: "SECURITY_DEPOSIT", amountPaise: input.amountPaise,
        paymentDate: input.paymentDate, method: input.method, reference: input.reference,
        notes: "Security deposit receipt", recordedByName: actorName,
      }, select: { id: true } });
      await tx.securityDepositTransaction.create({ data: {
        organizationId: stay.organizationId, depositAccountId: account.id, paymentId: payment.id,
        transactionType: "RECEIPT", amountPaise: input.amountPaise,
        description: "Security deposit received", createdById: actor.id,
      } });
    });
  },

  async transferSecurityDeposit(organizationId, actorId, input, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } });
      if (!actor) throw new ResidentWorkflowError("DEPOSIT_TRANSFER_INVALID");
      const accountScope = (stayId: string) => ({
        organization: { publicId: organizationId },
        status: "OPEN",
        residentStay: { publicId: stayId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] } },
        ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
      });
      const [source, destination] = await Promise.all([
        tx.securityDepositAccount.findFirst({
          where: accountScope(input.sourceStayId),
          select: { id: true, publicId: true, organizationId: true, propertyId: true, status: true, ledgerVersion: true, requiredAmountPaise: true, transactions: { select: { amountPaise: true } }, residentStay: { select: { publicId: true, residentId: true, property: { select: { name: true } } } } },
        }),
        tx.securityDepositAccount.findFirst({
          where: accountScope(input.destinationStayId),
          select: { id: true, publicId: true, organizationId: true, propertyId: true, status: true, ledgerVersion: true, requiredAmountPaise: true, transactions: { select: { amountPaise: true } }, residentStay: { select: { publicId: true, residentId: true, property: { select: { name: true } } } } },
        }),
      ]);
      if (!source || !destination || source.id === destination.id) throw new ResidentWorkflowError("DEPOSIT_TRANSFER_INVALID");
      const sourceBalance = source.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0));
      const destinationBalance = destination.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0));
      if (input.amountPaise > sourceBalance) throw new ResidentWorkflowError("DEPOSIT_TRANSFER_EXCEEDS_BALANCE");
      if (destinationBalance + input.amountPaise > destination.requiredAmountPaise) throw new ResidentWorkflowError("DEPOSIT_TRANSFER_EXCEEDS_REQUIRED");

      const sourceRemaining = sourceBalance - input.amountPaise;
      const reference = crypto.randomUUID();
      const orderedAccounts = [
        { id: source.id, version: source.ledgerVersion, source: true },
        { id: destination.id, version: destination.ledgerVersion, source: false },
      ].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      for (const account of orderedAccounts) {
        const updated = await tx.securityDepositAccount.updateMany({
          where: { id: account.id, status: "OPEN", ledgerVersion: account.version },
          data: { ledgerVersion: { increment: 1 }, ...(account.source && sourceRemaining === BigInt(0) ? { status: "TRANSFERRED" } : {}) },
        });
        if (updated.count !== 1) throw new ResidentWorkflowError("DEPOSIT_ACCOUNT_CHANGED");
      }
      const reason = input.reason.trim();
      await tx.securityDepositTransaction.createMany({
        data: [
          {
            organizationId: source.organizationId,
            depositAccountId: source.id,
            transactionType: "TRANSFER_OUT",
            amountPaise: -input.amountPaise,
            transferReference: reference,
            description: `Transfer to ${destination.residentStay.property.name} stay ${destination.residentStay.publicId}: ${reason}`,
            createdById: actor.id,
          },
          {
            organizationId: destination.organizationId,
            depositAccountId: destination.id,
            transactionType: "TRANSFER_IN",
            amountPaise: input.amountPaise,
            transferReference: reference,
            description: `Transfer from ${source.residentStay.property.name} stay ${source.residentStay.publicId}: ${reason}`,
            createdById: actor.id,
          },
        ],
      });
    });
  },

  async recordMoveOutNotice(organizationId, actorId, stayId, input: MoveOutNoticeInput, noticeDate, propertyIds, residentEmail) {
    await prisma.$transaction(async (tx) => {
      const [actor, stay] = await Promise.all([
        tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } }),
        tx.residentStay.findFirst({
          where: { organization: { publicId: organizationId }, publicId: stayId, status: "ACTIVE", ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}), ...(residentEmail ? { resident: { email: residentEmail } } : {}) },
          select: { id: true, organizationId: true, propertyId: true, startDate: true, lockInEndDate: true, property: { select: { settings: { select: { noticePeriodDays: true } } } } },
        }),
      ]);
      if (!actor || !stay) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const requestedCheckoutDate = dateOnly(input.requestedCheckoutDate);
      const today = dateOnly(noticeDate);
      if (requestedCheckoutDate < today) throw new ResidentWorkflowError("FUTURE_MOVE_OUT");
      if (requestedCheckoutDate < stay.startDate) throw new ResidentWorkflowError("MOVE_OUT_BEFORE_MOVE_IN");
      const noticePeriodDays = stay.property.settings?.noticePeriodDays ?? 30;
      if (requestedCheckoutDate < addDays(today, noticePeriodDays)) throw new ResidentWorkflowError("NOTICE_PERIOD_TOO_SHORT");
      const lockInOverride = stay.lockInEndDate !== null && requestedCheckoutDate < stay.lockInEndDate;
      if (lockInOverride && !input.lockInOverrideReason) throw new ResidentWorkflowError("LOCK_IN_ACTIVE");

      const changed = await tx.residentStay.updateMany({ where: { id: stay.id, status: "ACTIVE" }, data: { status: "NOTICE_PERIOD" } });
      if (changed.count !== 1) throw new ResidentWorkflowError("NOTICE_ALREADY_EXISTS");
      await tx.checkoutProcess.create({
        data: {
          organizationId: stay.organizationId,
          propertyId: stay.propertyId,
          residentStayId: stay.id,
          status: "NOTICE",
          noticeDate: today,
          requestedCheckoutDate,
          approvedCheckoutDate: requestedCheckoutDate,
          lockInOverride,
          lockInOverrideReason: lockInOverride ? input.lockInOverrideReason : null,
          createdById: actor.id,
        },
      });
    });
  },

  async checkOut(organizationId, actorId, actorName, residentId, input: CheckOutResidentData, propertyIds) {
    await prisma.$transaction(async (tx) => {
      const [actor, stay] = await Promise.all([tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } }), tx.residentStay.findFirst({
        where: {
          organization: { publicId: organizationId },
          publicId: input.stayId,
          resident: { publicId: residentId },
          ...(propertyIds ? { property: managerPropertyFilter(propertyIds) } : {}),
          status: { in: ["ACTIVE", "NOTICE_PERIOD"] },
        },
        select: {
          id: true, organizationId: true, propertyId: true, residentId: true, startDate: true, status: true,
          checkoutProcesses: { where: { status: "NOTICE" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, requestedCheckoutDate: true } },
          securityDepositAccount: { select: { id: true, ledgerVersion: true, status: true, transactions: { select: { amountPaise: true } } } },
          invoices: { select: { id: true, invoiceNumber: true, invoiceType: true, dueDate: true, totalPaise: true, amountPaidPaise: true, status: true }, orderBy: [{ dueDate: "asc" }, { id: "asc" }] },
        },
      })]);
      if (!actor || !stay) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
      const checkoutProcess = stay.checkoutProcesses[0];
      if (stay.status !== "NOTICE_PERIOD" || !checkoutProcess?.requestedCheckoutDate) throw new ResidentWorkflowError("MOVE_OUT_NOTICE_REQUIRED");
      const endDate = dateOnly(input.endDate);
      if (endDate < stay.startDate) throw new ResidentWorkflowError("MOVE_OUT_BEFORE_MOVE_IN");
      if (endDate < checkoutProcess.requestedCheckoutDate) throw new ResidentWorkflowError("CHECKOUT_BEFORE_NOTICE_DATE");
      if (stay.invoices.some((invoice) => invoice.status === "DRAFT")) throw new ResidentWorkflowError("CHECKOUT_DRAFT_INVOICES");

      const depositAccount = stay.securityDepositAccount;
      let depositBalance = depositAccount?.transactions.reduce((sum, transaction) => sum + transaction.amountPaise, BigInt(0)) ?? BigInt(0);
      if (depositBalance < BigInt(0)) depositBalance = BigInt(0);
      const invoiceBalances = stay.invoices
        .filter((invoice) => invoice.status === "FINALIZED" || invoice.status === "PARTIALLY_PAID")
        .map((invoice) => ({ ...invoice, balance: invoice.totalPaise - invoice.amountPaidPaise }));
      const totalDues = invoiceBalances.reduce((sum, invoice) => sum + invoice.balance, BigInt(0));
      const depositApplied = depositBalance < totalDues ? depositBalance : totalDues;
      const amountDueAfterDeposit = totalDues - depositApplied;
      if (input.additionalPaymentPaise !== amountDueAfterDeposit) throw new ResidentWorkflowError("CHECKOUT_PAYMENT_MISMATCH");
      if (input.damageDeductionPaise > depositBalance - depositApplied) throw new ResidentWorkflowError("CHECKOUT_DEDUCTION_EXCEEDS_BALANCE");
      const refundAmount = depositBalance - depositApplied - input.damageDeductionPaise;
      await tx.checkoutSettlement.create({ data: {
        checkoutProcessId: checkoutProcess.id,
        securityDepositBalancePaise: depositBalance,
        totalDuesPaise: totalDues,
        totalDeductionsPaise: depositApplied + input.damageDeductionPaise,
        refundAmountPaise: refundAmount,
        finalPayablePaise: BigInt(0),
        status: "SETTLED",
        items: { create: [
          ...invoiceBalances.map((invoice) => ({ itemType: "PENDING_INVOICE", description: `${invoice.invoiceType === "ELECTRICITY" ? "Electricity" : "Rent"} invoice ${invoice.invoiceNumber}`, amountPaise: invoice.balance })),
          ...(depositApplied > BigInt(0) ? [{ itemType: "DEPOSIT", description: "Security deposit applied to invoice dues", amountPaise: depositApplied }] : []),
          ...(input.damageDeductionPaise > BigInt(0) ? [{ itemType: "DAMAGE", description: input.damageReason!, amountPaise: input.damageDeductionPaise }] : []),
          ...(input.additionalPaymentPaise > BigInt(0) ? [{ itemType: "OTHER", description: "Additional invoice balance collected", amountPaise: input.additionalPaymentPaise }] : []),
          ...(refundAmount > BigInt(0) ? [{ itemType: "REFUND", description: "Security deposit refund", amountPaise: refundAmount }] : []),
        ] },
      } });

      let depositToApply = depositApplied;
      let additionalToApply = input.additionalPaymentPaise;
      for (const invoice of invoiceBalances) {
        const depositPart = depositToApply < invoice.balance ? depositToApply : invoice.balance;
        depositToApply -= depositPart;
        const afterDeposit = invoice.balance - depositPart;
        const additionalPart = additionalToApply < afterDeposit ? additionalToApply : afterDeposit;
        additionalToApply -= additionalPart;
        const paidAmount = depositPart + additionalPart;
        if (paidAmount === BigInt(0)) continue;
        const newPaid = invoice.amountPaidPaise + paidAmount;
        const updated = await tx.invoice.updateMany({ where: { id: invoice.id, amountPaidPaise: invoice.amountPaidPaise, status: invoice.status }, data: { amountPaidPaise: newPaid, status: newPaid === invoice.totalPaise ? "PAID" : "PARTIALLY_PAID" } });
        if (updated.count !== 1) throw new ResidentWorkflowError("CHECKOUT_PAYMENT_MISMATCH");
        if (depositPart > BigInt(0)) {
          const payment = await tx.payment.create({ data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentId: stay.residentId, residentStayId: stay.id, invoiceId: invoice.id, purpose: "INVOICE", amountPaise: depositPart, paymentDate: input.paymentDate, method: "OTHER", notes: "Applied from security deposit at checkout", recordedByName: actorName }, select: { id: true } });
          await tx.securityDepositTransaction.create({ data: { organizationId: stay.organizationId, depositAccountId: depositAccount!.id, paymentId: payment.id, transactionType: "DEDUCTION", amountPaise: -depositPart, description: `Applied to ${invoice.invoiceType === "ELECTRICITY" ? "electricity" : "rent"} invoice ${invoice.invoiceNumber} at checkout`, createdById: actor.id } });
        }
        if (additionalPart > BigInt(0)) await tx.payment.create({ data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentId: stay.residentId, residentStayId: stay.id, invoiceId: invoice.id, purpose: "INVOICE", amountPaise: additionalPart, paymentDate: input.paymentDate, method: input.additionalPaymentMethod, reference: input.reference, notes: "Final invoice balance paid at checkout", recordedByName: actorName } });
      }

      if (input.damageDeductionPaise > BigInt(0) && depositAccount) {
        await tx.securityDepositTransaction.create({ data: { organizationId: stay.organizationId, depositAccountId: depositAccount.id, transactionType: "DEDUCTION", amountPaise: -input.damageDeductionPaise, description: input.damageReason!, createdById: actor.id } });
      }
      if (refundAmount > BigInt(0) && depositAccount) {
        const refundPayment = await tx.payment.create({ data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentId: stay.residentId, residentStayId: stay.id, purpose: "SECURITY_DEPOSIT_REFUND", amountPaise: refundAmount, paymentDate: input.paymentDate, method: input.depositRefundMethod, reference: input.reference, notes: "Security deposit refund at checkout", recordedByName: actorName }, select: { id: true } });
        await tx.securityDepositTransaction.create({ data: { organizationId: stay.organizationId, depositAccountId: depositAccount.id, paymentId: refundPayment.id, transactionType: "REFUND", amountPaise: -refundAmount, description: "Security deposit refund at checkout", createdById: actor.id } });
      }
      if (depositAccount) {
        const locked = await tx.securityDepositAccount.updateMany({ where: { id: depositAccount.id, status: "OPEN", ledgerVersion: depositAccount.ledgerVersion }, data: { status: "SETTLED", ledgerVersion: { increment: 1 } } });
        if (locked.count !== 1) throw new ResidentWorkflowError("DEPOSIT_ACCOUNT_CHANGED");
      }
      await tx.checkoutProcess.update({ where: { id: checkoutProcess.id, status: "NOTICE" }, data: { status: "COMPLETED", actualMoveOutDate: endDate, completedAt: new Date() } });
      const result = await tx.residentStay.updateMany({
        where: { id: stay.id, status: "NOTICE_PERIOD" },
        data: {
          status: "COMPLETED",
          endDate,
          activeBedSlot: null,
          activeResidentSlot: null,
        },
      });
      if (result.count !== 1) throw new ResidentWorkflowError("STAY_NOT_ACTIVE");
    });
  },
};
