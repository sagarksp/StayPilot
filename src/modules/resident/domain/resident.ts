export type ResidentStayStatus = "ACTIVE" | "ENDED";

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
  rent: Readonly<{ amountPaise: bigint; billingCycleType: "MOVE_IN_DAY" | "FIXED_DAY"; billingDay: number | null }> | null;
}>;

export type ResidentSummary = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  currentStay: ResidentStaySummary | null;
  latestStay: ResidentStaySummary | null;
}>;

export type ResidentDetail = Readonly<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  stays: readonly ResidentStaySummary[];
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
}>;

export type OccupancyTotals = Readonly<{
  activeBedCount: number;
  occupiedBedCount: number;
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

export type CheckOutResidentInput = Readonly<{
  stayId: string;
  endDate: string;
}>;

export type ResidentWorkflowErrorCode =
  | "BED_UNAVAILABLE"
  | "STAY_NOT_ACTIVE"
  | "FUTURE_MOVE_IN"
  | "FUTURE_MOVE_OUT"
  | "MOVE_OUT_BEFORE_MOVE_IN"
  | "ACTIVE_STAY_EXISTS";

export class ResidentWorkflowError extends Error {
  constructor(readonly code: ResidentWorkflowErrorCode) {
    super(code);
    this.name = "ResidentWorkflowError";
  }
}
