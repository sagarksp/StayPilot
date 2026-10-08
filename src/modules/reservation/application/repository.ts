import type { ReservationOverview, ReservationSummary } from "../domain/reservation";
import type { CreateReservationData } from "./schemas";
import type { RentTerms } from "@/modules/billing/application/schemas";

export interface ReservationRepository {
  listReservations(organizationId: string, propertyIds?: readonly string[]): Promise<ReservationSummary[]>;
  listCandidates(organizationId: string, propertyIds?: readonly string[]): Promise<{
    residents: { id: string; name: string; phone: string }[];
    beds: { id: string; propertyId: string; propertyName: string; floorName: string; roomNumber: string; label: string }[];
  }>;
  getOverview(organizationId: string, today: string, propertyIds?: readonly string[]): Promise<ReservationOverview>;
  expireReservations(organizationId: string, today: string, propertyIds?: readonly string[]): Promise<void>;
  createReservation(organizationId: string, actorId: string, today: string, input: CreateReservationData, propertyIds?: readonly string[]): Promise<string>;
  cancelReservation(organizationId: string, actorId: string, reservationId: string, reason: string, propertyIds?: readonly string[]): Promise<void>;
  moveIn(organizationId: string, reservationId: string, date: string, rent: RentTerms, propertyIds?: readonly string[]): Promise<void>;
}
