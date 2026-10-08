import { assertCanReadProperty, AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import type { ResidentRepository } from "./repository";
import {
  assignResidentBedSchema,
  checkOutResidentSchema,
  createResidentSchema,
  type AssignResidentForm,
  type CheckOutResidentData,
  type CreateResidentForm,
} from "./schemas";
import { ResidentWorkflowError } from "../domain/resident";
import { rentTermsSchema, type RentTermsInput } from "@/modules/billing/application/schemas";

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
      return repository.listResidents(actor.organizationId, propertyScope(actor));
    },

    async getResident(actor: OrganizationActor, residentId: string) {
      assertStaff(actor);
      return repository.getResident(actor.organizationId, residentId, propertyScope(actor));
    },

    async listAvailableBeds(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listAvailableBeds(actor.organizationId, propertyScope(actor));
    },

    async listCurrentAssignments(actor: OrganizationActor, propertyId: string) {
      assertStaff(actor);
      assertCanReadProperty(actor, propertyId);
      return repository.listCurrentAssignments(actor.organizationId, propertyId);
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
      const resident = await repository.getResident(actor.organizationId, residentId, propertyScope(actor));
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

    async checkOut(actor: OrganizationActor, residentId: string, input: CheckOutResidentData) {
      assertStaff(actor);
      const resident = await repository.getResident(actor.organizationId, residentId, propertyScope(actor));
      if (!resident) return null;
      const parsed = checkOutResidentSchema.parse(input);
      if (parsed.endDate > todayInTimezone(actor.organizationTimezone)) {
        throw new ResidentWorkflowError("FUTURE_MOVE_OUT");
      }
      await repository.checkOut(actor.organizationId, residentId, parsed, propertyScope(actor));
      return residentId;
    },
  };
}
