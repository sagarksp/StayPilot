import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { ComplaintWorkflowError } from "../domain/complaint";
import type { ComplaintRepository } from "./repository";
import { complaintReportFilterSchema, createComplaintSchema, updateComplaintSchema, type CreateComplaintInput, type UpdateComplaintForm } from "./schemas";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}

export function createComplaintUseCases(repository: ComplaintRepository) {
  return {
    async listForStaff(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.listForStaff(actor);
    },

    async getForStaff(actor: OrganizationActor, complaintId: string) {
      assertStaff(actor);
      return repository.getForStaff(actor, complaintId);
    },

    async getMetricsForStaff(actor: OrganizationActor) {
      assertStaff(actor);
      return repository.getMetricsForStaff(actor);
    },

    async getReportForStaff(actor: OrganizationActor, input: unknown) {
      assertStaff(actor);
      const filters = complaintReportFilterSchema.parse(input);
      return repository.getReportForStaff(actor, filters);
    },

    async listForResident(actor: OrganizationActor) {
      if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
      return repository.listForResident(actor.organizationId, actor.userEmail);
    },

    async getForResident(actor: OrganizationActor, complaintId: string) {
      if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
      return repository.getForResident(actor.organizationId, actor.userEmail, complaintId);
    },

    async createForResident(actor: OrganizationActor, input: CreateComplaintInput) {
      if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
      const parsed = createComplaintSchema.parse(input);
      return repository.createForResident(actor.organizationId, actor.userEmail, actor.userId, parsed);
    },

    async updateForStaff(actor: OrganizationActor, input: UpdateComplaintForm) {
      assertStaff(actor);
      const parsed = updateComplaintSchema.parse(input);
      if (!parsed.status && parsed.assignedToId === undefined && parsed.category === undefined) throw new ComplaintWorkflowError("INVALID_STATUS_TRANSITION");
      if (parsed.status === "RESOLVED" && !parsed.resolutionNote) throw new ComplaintWorkflowError("RESOLUTION_NOTE_REQUIRED");
      return repository.updateForStaff(actor, parsed);
    },
  };
}
