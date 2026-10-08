export type ReservationStatus = "ACTIVE" | "MOVED_IN" | "CANCELLED" | "EXPIRED";

export type ReservationBed = Readonly<{
  id: string;
  propertyId: string;
  propertyName: string;
  floorName: string;
  roomNumber: string;
  label: string;
}>;

export type ReservationSummary = Readonly<{
  id: string;
  status: ReservationStatus;
  residentId: string;
  residentName: string;
  residentPhone: string;
  residentEmail: string | null;
  bed: ReservationBed;
  reservationDate: Date;
  reservationStartDate: Date;
  reservationEndDate: Date;
  expectedMoveInDate: Date | null;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: Date;
}>;

export type ReservationOverview = Readonly<{
  activeCount: number;
  reservedBedCountToday: number;
}>;

export type ReservationErrorCode =
  | "BED_UNAVAILABLE"
  | "BED_NOT_OPERATIONAL"
  | "ACTIVE_RESERVATION_EXISTS"
  | "RESIDENT_HAS_ACTIVE_STAY"
  | "RESERVATION_NOT_ACTIVE"
  | "RESERVATION_NOT_FOUND"
  | "MOVE_IN_OUTSIDE_RESERVATION"
  | "MOVE_IN_IN_FUTURE"
  | "RESERVATION_START_IN_PAST"
  | "DATE_ORDER";

export class ReservationWorkflowError extends Error {
  constructor(readonly code: ReservationErrorCode) {
    super(code);
    this.name = "ReservationWorkflowError";
  }
}
