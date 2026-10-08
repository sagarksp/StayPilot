import type {
  AvailableBed,
  AssignResidentBedInput,
  CheckOutResidentInput,
  CreateResidentInput,
  CurrentBedAssignment,
  OccupancyTotals,
  ResidentDetail,
  ResidentSummary,
} from "../domain/resident";
import type { RentTerms } from "@/modules/billing/application/schemas";

/** Every repository method is scoped to one organization and, for managers, assigned properties. */
export interface ResidentRepository {
  listResidents(organizationId: string, propertyIds?: readonly string[]): Promise<ResidentSummary[]>;
  getResident(organizationId: string, residentId: string, propertyIds?: readonly string[]): Promise<ResidentDetail | null>;
  listAvailableBeds(organizationId: string, propertyIds?: readonly string[]): Promise<AvailableBed[]>;
  listCurrentAssignments(organizationId: string, propertyId: string): Promise<CurrentBedAssignment[]>;
  getOccupancy(organizationId: string, propertyIds?: readonly string[]): Promise<OccupancyTotals>;
  createResidentWithStay(organizationId: string, input: CreateResidentInput, propertyIds?: readonly string[]): Promise<string>;
  assignBed(organizationId: string, residentId: string, input: AssignResidentBedInput, propertyIds?: readonly string[]): Promise<void>;
  setRentTerms(organizationId: string, residentId: string, stayId: string, input: RentTerms, effectiveFrom: string, propertyIds?: readonly string[]): Promise<void>;
  checkOut(organizationId: string, residentId: string, input: CheckOutResidentInput, propertyIds?: readonly string[]): Promise<void>;
}
