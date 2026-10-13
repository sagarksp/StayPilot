import { assertCanReadProperty, AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import type { ResidentRepository } from "./repository";
import {
  assignResidentBedSchema,
  checkOutResidentSchema,
  createResidentSchema,
  type AssignResidentForm,
  type CheckOutResidentForm,
  type CreateResidentForm,
  moveOutNoticeSchema,
  type MoveOutNoticeForm,
  updateResidentEmailSchema,
  securityDepositTransferSchema,
  type SecurityDepositTransferForm,
} from "./schemas";
import { ResidentWorkflowError } from "../domain/resident";
import { rentTermsSchema, recordSecurityDepositReceiptSchema, type RecordSecurityDepositReceiptInput, type RentTermsInput } from "@/modules/billing/application/schemas";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) {
    throw new AccessDeniedError();
  }
}

function propertyScope(actor: OrganizationActor) {
  return actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds;
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function databaseCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function mapUniqueConflict(error: unknown): never {
  if (databaseCode(error) === "P2002") throw new ResidentWorkflowError("BED_UNAVAILABLE");
  throw error;
}

export function createResidentUseCases(repository: ResidentRepository) {
  return {
    async listResidents(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listResidents(actor.organizationId, todayInTimezone(actor.organizationTimezone), propertyScope(actor));
    },

    async getResident(actor: OrganizationActor, residentId: string) {
      assertStaff(actor);
      return repository.getResident(actor.organizationId, residentId, todayInTimezone(actor.organizationTimezone), propertyScope(actor));
    },

    async updateResidentEmail(actor: OrganizationActor, residentId: string, email: string) {
      assertStaff(actor);
      const resident = await repository.getResident(actor.organizationId, residentId, todayInTimezone(actor.organizationTimezone), propertyScope(actor));
      if (!resident) return null;
      const parsedEmail = updateResidentEmailSchema.parse(email);
      await repository.updateResidentEmail(actor.organizationId, residentId, parsedEmail, propertyScope(actor));
      return residentId;
    },

    async getResidentPortal(actor: OrganizationActor) {
      if (!actor.roles.includes("RESIDENT")) throw new AccessDeniedError();
      return repository.getResidentPortal(actor.organizationId, actor.userId, todayInTimezone(actor.organizationTimezone));
    },

    async listDepositTransferAccounts(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listDepositTransferAccounts(actor.organizationId, propertyScope(actor));
    },

    async listDepositTransfers(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listDepositTransfers(actor.organizationId, propertyScope(actor));
    },

    async transferSecurityDeposit(actor: OrganizationActor, input: SecurityDepositTransferForm) {
      assertStaff(actor);
      const parsed = securityDepositTransferSchema.parse(input);
      await repository.transferSecurityDeposit(actor.organizationId, actor.userId, parsed, propertyScope(actor));
    },

    async listAvailableBeds(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listAvailableBeds(actor.organizationId, propertyScope(actor));
    },

    async listCurrentAssignments(actor: OrganizationActor, propertyId: string) {
      assertStaff(actor);
      assertCanReadProperty(actor, propertyId);
      return repository.listCurrentAssignments(actor.organizationId, propertyId, todayInTimezone(actor.organizationTimezone));
    },

    async getOccupancy(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.getOccupancy(actor.organizationId, propertyScope(actor));
    },

    async createResidentWithStay(actor: OrganizationActor, input: CreateResidentForm) {
      assertStaff(actor);
      const parsed = createResidentSchema.parse(input);
      if (parsed.startDate > todayInTimezone(actor.organizationTimezone)) {
        throw new ResidentWorkflowError("FUTURE_MOVE_IN");
      }
      try {
        return await repository.createResidentWithStay(actor.organizationId, parsed, propertyScope(actor));
      } catch (error) {
        mapUniqueConflict(error);
      }
    },

    async assignBed(actor: OrganizationActor, residentId: string, input: AssignResidentForm) {
      assertStaff(actor);
      const resident = await repository.getResident(actor.organizationId, residentId, todayInTimezone(actor.organizationTimezone), propertyScope(actor));
      if (!resident) return null;
      const parsed = assignResidentBedSchema.parse(input);
      if (parsed.startDate > todayInTimezone(actor.organizationTimezone)) {
        throw new ResidentWorkflowError("FUTURE_MOVE_IN");
      }
      try {
        await repository.assignBed(actor.organizationId, residentId, parsed, propertyScope(actor));
      } catch (error) {
        mapUniqueConflict(error);
      }
      return residentId;
    },

    async setRentTerms(actor: OrganizationActor, residentId: string, stayId: string, input: RentTermsInput) {
      assertStaff(actor);
      const parsed = rentTermsSchema.parse(input);
      const today = todayInTimezone(actor.organizationTimezone);
      await repository.setRentTerms(actor.organizationId, residentId, stayId, parsed, today, propertyScope(actor));
      return residentId;
    },

    async recordSecurityDepositReceipt(actor: OrganizationActor, residentId: string, stayId: string, input: RecordSecurityDepositReceiptInput) {
      assertStaff(actor);
      const parsed = recordSecurityDepositReceiptSchema.parse(input);
      await repository.recordSecurityDepositReceipt(actor.organizationId, actor.userId, actor.userName, residentId, stayId, parsed, propertyScope(actor));
      return residentId;
    },

    async recordMoveOutNotice(actor: OrganizationActor, input: MoveOutNoticeForm) {
      const parsed = moveOutNoticeSchema.parse(input);
      const isStaff = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER");
      const isResident = actor.roles.includes("RESIDENT") && Boolean(actor.userEmail);
      if (!isStaff && !isResident) throw new AccessDeniedError();
      if (!isStaff && parsed.lockInOverrideReason) throw new AccessDeniedError();
      const today = todayInTimezone(actor.organizationTimezone);
      if (parsed.requestedCheckoutDate < today) throw new ResidentWorkflowError("FUTURE_MOVE_OUT");
      await repository.recordMoveOutNotice(actor.organizationId, actor.userId, parsed.stayId, parsed, today, isStaff ? propertyScope(actor) : undefined, isResident && !isStaff ? actor.userEmail : undefined);
      return parsed.stayId;
    },

    async checkOut(actor: OrganizationActor, residentId: string, input: CheckOutResidentForm) {
      assertStaff(actor);
      const resident = await repository.getResident(actor.organizationId, residentId, todayInTimezone(actor.organizationTimezone), propertyScope(actor));
      if (!resident) return null;
      const parsed = checkOutResidentSchema.parse(input);
      if (parsed.endDate > todayInTimezone(actor.organizationTimezone)) {
        throw new ResidentWorkflowError("FUTURE_MOVE_OUT");
      }
      if (parsed.paymentDate.toISOString().slice(0, 10) > todayInTimezone(actor.organizationTimezone)) {
        throw new ResidentWorkflowError("FUTURE_MOVE_OUT");
      }
      await repository.checkOut(actor.organizationId, actor.userId, actor.userName, residentId, parsed, propertyScope(actor));
      return residentId;
    },
  };
}
