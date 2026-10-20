import type { ReservationOverview, ReservationSummary } from "../domain/reservation";
import type { CreateReservationData, ReservationReportFilters } from "./schemas";
import type { RentTerms, SecurityDepositTerms } from "@/modules/billing/application/schemas";

export interface ReservationRepository {
  listReservations(organizationId: string, propertyIds?: readonly string[]): Promise<ReservationSummary[]>;
  listCandidates(organizationId: string, propertyIds?: readonly string[]): Promise<{
    residents: { id: string; name: string; phone: string }[];
    beds: { id: string; propertyId: string; propertyName: string; floorName: string; roomNumber: string; label: string }[];
  }>;
  getOverview(organizationId: string, today: string, propertyIds?: readonly string[]): Promise<ReservationOverview>;
  getReport(organizationId: string, propertyIds: readonly string[] | undefined, filters: ReservationReportFilters): Promise<Readonly<{
    properties: readonly Readonly<{ publicId: string; name: string }>[];
    rows: readonly Readonly<{ id: string; status: string; residentName: string; propertyName: string; roomNumber: string; bedLabel: string; reservationDate: Date; startDate: Date; endDate: Date; expectedMoveInDate: Date | null; createdAt: Date; prepaidDepositPaise: bigint }>[];
    totals: Readonly<{ total: number; active: number; movedIn: number; cancelled: number; expired: number; prepaidDepositPaise: bigint }>;
  }>>;
  expireReservations(organizationId: string, today: string, propertyIds?: readonly string[]): Promise<void>;
  createReservation(organizationId: string, actorId: string, today: string, input: CreateReservationData, propertyIds?: readonly string[]): Promise<string>;
  cancelReservation(organizationId: string, actorId: string, reservationId: string, reason: string, propertyIds?: readonly string[]): Promise<void>;
  moveIn(organizationId: string, reservationId: string, date: string, rent: RentTerms, deposit: SecurityDepositTerms, propertyIds?: readonly string[]): Promise<string>;
}
