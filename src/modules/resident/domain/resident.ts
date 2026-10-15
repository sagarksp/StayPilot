export type ResidentStayStatus = "ACTIVE" | "NOTICE_PERIOD" | "CHECKOUT_PROCESSING" | "COMPLETED" | "ENDED";

export type ResidentStaySummary = Readonly<{
  id: string;
  propertyId: string;
  propertyName: string;
  bedId: string;
  bedLabel: string;
  roomNumber: string;
  floorName: string;
  startDate: Date;
  endDate: Date | null;
  status: ResidentStayStatus;
  lockInMonths: number;
  lockInEndDate: Date | null;
  noticePeriodDays: number;
  checkoutNotice: Readonly<{ noticeDate: Date | null; requestedCheckoutDate: Date | null; lockInOverride: boolean; lockInOverrideReason: string | null }> | null;
  rent: Readonly<{ amountPaise: bigint; billingCycleType: "MOVE_IN_DAY" | "FIXED_DAY"; billingDay: number | null }> | null;
  finalizedInvoiceDuePaise: bigint;
  draftInvoiceCount: number;
  securityDeposit: Readonly<{
    requiredAmountPaise: bigint;
    policyType: string;
    status: string;
    balancePaise: bigint;
    transactions: readonly Readonly<{ id: string; type: string; amountPaise: bigint; createdAt: Date; description: string | null; method: string | null; paymentDate: Date | null; reference: string | null }>[];
  }> | null;
  invoices: readonly Readonly<{
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    dueDate: Date;
    status: string;
    totalPaise: bigint;
    adjustmentPaise: bigint;
    amountPaidPaise: bigint;
    items: readonly Readonly<{ description: string; quantity: number; unitAmountPaise: bigint; lineTotalPaise: bigint }>[];
    payments: readonly Readonly<{ amountPaise: bigint; paymentDate: Date; method: string; reference: string | null; transactionType: string; notes: string | null }>[];
  }>[];
}>;

export type ResidentReservationSummary = Readonly<{
  id: string;
  startDate: Date;
  endDate: Date;
  expectedMoveInDate: Date | null;
  propertyName: string;
  roomNumber: string;
  bedLabel: string;
  prepaidSecurityDepositPaise: bigint;
}>;

export type ResidentSummary = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  currentStay: ResidentStaySummary | null;
  latestStay: ResidentStaySummary | null;
  currentReservation: ResidentReservationSummary | null;
}>;

export type ResidentDetail = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  stays: readonly ResidentStaySummary[];
  currentReservation: ResidentReservationSummary | null;
}>;

export type AvailableBed = Readonly<{
  id: string;
  propertyId: string;
  propertyName: string;
  floorName: string;
  roomNumber: string;
  label: string;
}>;

export type CurrentBedAssignment = Readonly<{
  bedId: string;
  residentId: string;
  residentName: string;
  startDate: Date;
  monthlyRentPaise: bigint;
  billingCycleType: "MOVE_IN_DAY" | "FIXED_DAY";
  billingDay: number | null;
}>;

export type OccupancyTotals = Readonly<{
  activeBedCount: number;
  occupiedBedCount: number;
}>;

export type DepositTransferAccountOption = Readonly<{
  stayId: string;
  residentName: string;
  propertyName: string;
  roomNumber: string;
  bedLabel: string;
  stayStatus: string;
  requiredAmountPaise: bigint;
  balancePaise: bigint;
}>;

export type DepositTransferRecord = Readonly<{
  reference: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT";
  amountPaise: bigint;
  createdAt: Date;
  description: string | null;
  residentName: string;
  propertyName: string;
  recordedByName: string;
}>;

export type CreateResidentInput = Readonly<{
  name: string;
  phone: string;
  email?: string;
  bedId: string;
  startDate: string;
}>;

export type AssignResidentBedInput = Readonly<{
  bedId: string;
  startDate: string;
}>;

export type ResidentWorkflowErrorCode =
  | "BED_UNAVAILABLE"
  | "STAY_NOT_ACTIVE"
  | "FUTURE_MOVE_IN"
  | "FUTURE_MOVE_OUT"
  | "MOVE_OUT_BEFORE_MOVE_IN"
  | "ACTIVE_STAY_EXISTS"
  | "ACTIVE_RESERVATION_EXISTS"
  | "RESIDENT_EMAIL_TAKEN"
  | "DEPOSIT_EXCEEDS_REQUIRED"
  | "CHECKOUT_DRAFT_INVOICES"
  | "CHECKOUT_PAYMENT_MISMATCH"
  | "CHECKOUT_DEDUCTION_EXCEEDS_BALANCE"
  | "CHECKOUT_DEPOSIT_ACCOUNT_REQUIRED"
  | "NOTICE_PERIOD_TOO_SHORT"
  | "LOCK_IN_ACTIVE"
  | "MOVE_OUT_NOTICE_REQUIRED"
  | "CHECKOUT_BEFORE_NOTICE_DATE"
  | "NOTICE_ALREADY_EXISTS"
  | "DEPOSIT_TRANSFER_INVALID"
  | "DEPOSIT_TRANSFER_EXCEEDS_BALANCE"
  | "DEPOSIT_TRANSFER_EXCEEDS_REQUIRED"
  | "DEPOSIT_ACCOUNT_CHANGED";

export class ResidentWorkflowError extends Error {
  constructor(readonly code: ResidentWorkflowErrorCode) {
    super(code);
    this.name = "ResidentWorkflowError";
  }
}
