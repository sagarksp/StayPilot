import type { OrganizationActor } from "@/modules/property/domain/inventory";
import type { ComplaintSummary } from "../domain/complaint";
import type { CreateComplaintInput, UpdateComplaintInput } from "./schemas";

export interface ComplaintRepository {
  listForStaff(actor: OrganizationActor): Promise<ComplaintSummary[]>;
  getForStaff(actor: OrganizationActor, complaintId: string): Promise<ComplaintSummary | null>;
  getMetricsForStaff(actor: OrganizationActor): Promise<Readonly<{ byStatus: ReadonlyArray<{ status: string; count: number }>; byCategory: ReadonlyArray<{ category: string; count: number }> }>>;
  listForResident(organizationId: string, residentEmail: string): Promise<ComplaintSummary[]>;
  getForResident(organizationId: string, residentEmail: string, complaintId: string): Promise<ComplaintSummary | null>;
  createForResident(organizationId: string, residentEmail: string, actorId: string, input: CreateComplaintInput): Promise<string>;
  updateForStaff(actor: OrganizationActor, input: UpdateComplaintInput): Promise<void>;
}
