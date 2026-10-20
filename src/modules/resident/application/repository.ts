import type {
  AvailableBed,
  CurrentBedAssignment,
  OccupancyTotals,
  ResidentDetail,
  ResidentSummary,
  DepositTransferAccountOption,
  DepositTransferRecord,
} from "../domain/resident";
import type { RentTerms } from "@/modules/billing/application/schemas";
import type { AssignResidentBedData, CheckOutResidentData, CreateResidentData, MoveOutNoticeInput, ResidentSelfProfileInput, SecurityDepositTransferInput } from "./schemas";
import type { RecordSecurityDepositReceipt } from "@/modules/billing/application/schemas";

/** Every repository method is scoped to one organization and, for managers, assigned properties. */
export interface ResidentRepository {
  listResidents(organizationId: string, asOfDate: string, propertyIds?: readonly string[]): Promise<ResidentSummary[]>;
  getResident(organizationId: string, residentId: string, asOfDate: string, propertyIds?: readonly string[]): Promise<ResidentDetail | null>;
  getResidentPortal(organizationId: string, userId: string, asOfDate: string): Promise<ResidentDetail | null>;
  updateResidentSelfProfile(organizationId: string, userId: string, input: ResidentSelfProfileInput): Promise<boolean>;
  updateResidentEmail(organizationId: string, residentId: string, email: string, propertyIds?: readonly string[]): Promise<void>;
  listAvailableBeds(organizationId: string, propertyIds?: readonly string[]): Promise<AvailableBed[]>;
  listCurrentAssignments(organizationId: string, propertyId: string, asOfDate: string): Promise<CurrentBedAssignment[]>;
  getOccupancy(organizationId: string, propertyIds?: readonly string[]): Promise<OccupancyTotals>;
  createResidentWithStay(organizationId: string, input: CreateResidentData, propertyIds?: readonly string[]): Promise<string>;
  assignBed(organizationId: string, residentId: string, input: AssignResidentBedData, propertyIds?: readonly string[]): Promise<void>;
  setRentTerms(organizationId: string, residentId: string, stayId: string, input: RentTerms, effectiveFrom: string, propertyIds?: readonly string[]): Promise<void>;
  recordSecurityDepositReceipt(organizationId: string, actorId: string, actorName: string, residentId: string, stayId: string, input: RecordSecurityDepositReceipt, propertyIds?: readonly string[]): Promise<void>;
  recordMoveOutNotice(organizationId: string, actorId: string, stayId: string, input: MoveOutNoticeInput, noticeDate: string, propertyIds?: readonly string[], residentEmail?: string): Promise<void>;
  checkOut(organizationId: string, actorId: string, actorName: string, residentId: string, input: CheckOutResidentData, propertyIds?: readonly string[]): Promise<void>;
  listDepositTransferAccounts(organizationId: string, propertyIds?: readonly string[]): Promise<DepositTransferAccountOption[]>;
  listDepositTransfers(organizationId: string, propertyIds?: readonly string[]): Promise<DepositTransferRecord[]>;
  transferSecurityDeposit(organizationId: string, actorId: string, input: SecurityDepositTransferInput, propertyIds?: readonly string[]): Promise<void>;
}
