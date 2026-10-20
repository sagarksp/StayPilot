import {
  assertCanManageInventory,
  assertCanReadProperty,
  AccessDeniedError,
  type OrganizationActor,
} from "../domain/inventory";
import type { PropertyRepository, PropertyUseCases } from "./repository";
import {
  createBedSchema,
  createFloorSchema,
  createPropertySchema,
  createRoomSchema,
  type CreateBedInput,
  type CreateFloorInput,
  type CreatePropertyInput,
  type CreateRoomInput,
  type OccupancyReportFilters,
  propertyStayPolicySchema,
  type PropertyStayPolicyInput,
} from "./schemas";

function assertOwner(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER")) throw new AccessDeniedError();
}

export function createPropertyUseCases(repository: PropertyRepository): PropertyUseCases {
  return {
    async listProperties(actor: OrganizationActor) {
      const scope = actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds;
      return repository.listProperties(actor.organizationId, scope);
    },

    async getInventory(actor, propertyId) {
      assertCanReadProperty(actor, propertyId);
      const property = await repository.getProperty(actor.organizationId, propertyId);
      if (!property) return null;
      const [floors, rooms, beds] = await Promise.all([
        repository.listFloors(actor.organizationId, propertyId),
        repository.listRooms(actor.organizationId, propertyId),
        repository.listBeds(actor.organizationId, propertyId),
      ]);
      return { property, floors, rooms, beds };
    },

    async createProperty(actor, input: CreatePropertyInput) {
      assertCanManageInventory(actor);
      return repository.createProperty(actor.organizationId, createPropertySchema.parse(input));
    },

    async createFloor(actor, propertyId, input: CreateFloorInput) {
      assertCanManageInventory(actor, propertyId);
      return repository.createFloor(actor.organizationId, propertyId, createFloorSchema.parse(input));
    },

    async createRoom(actor, propertyId, input: CreateRoomInput) {
      assertCanManageInventory(actor, propertyId);
      return repository.createRoom(actor.organizationId, propertyId, createRoomSchema.parse(input));
    },

    async createBed(actor, propertyId, input: CreateBedInput) {
      assertCanManageInventory(actor, propertyId);
      return repository.createBed(actor.organizationId, propertyId, createBedSchema.parse(input));
    },

    async listStayPolicies(actor) {
      assertOwner(actor);
      return repository.listStayPolicies(actor.organizationId);
    },

    async getOccupancyReport(actor: OrganizationActor, filters: OccupancyReportFilters) {
      if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
      const allowed = actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds;
      if (filters.propertyId && allowed && !allowed.includes(filters.propertyId)) throw new AccessDeniedError();
      const report = await repository.getOccupancyReport(actor.organizationId, allowed, filters);
      if (filters.propertyId && !report.properties.some((property) => property.publicId === filters.propertyId)) throw new AccessDeniedError();
      return report;
    },

    async updateStayPolicy(actor, input: PropertyStayPolicyInput) {
      assertOwner(actor);
      await repository.updateStayPolicy(actor.organizationId, propertyStayPolicySchema.parse(input));
    },
  };
}
