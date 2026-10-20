import type { OrganizationActor } from "@/modules/property/domain/inventory";
import type { ComplaintReportRow, ComplaintSummary } from "../domain/complaint";
import type { complaintReportFilterSchema, CreateComplaintInput, UpdateComplaintInput } from "./schemas";
import type { z } from "zod";

type ComplaintReportFilters = z.infer<typeof complaintReportFilterSchema>;

export interface ComplaintRepository {
  listForStaff(actor: OrganizationActor): Promise<ComplaintSummary[]>;
  getForStaff(actor: OrganizationActor, complaintId: string): Promise<ComplaintSummary | null>;
  getMetricsForStaff(actor: OrganizationActor): Promise<Readonly<{ byStatus: ReadonlyArray<{ status: string; count: number }>; byCategory: ReadonlyArray<{ category: string; count: number }> }>>;
  getReportForStaff(actor: OrganizationActor, filters: ComplaintReportFilters): Promise<Readonly<{ properties: readonly Readonly<{ publicId: string; name: string }>[]; rows: readonly ComplaintReportRow[] }>>;
  listForResident(organizationId: string, residentEmail: string): Promise<ComplaintSummary[]>;
  getForResident(organizationId: string, residentEmail: string, complaintId: string): Promise<ComplaintSummary | null>;
  createForResident(organizationId: string, residentEmail: string, actorId: string, input: CreateComplaintInput): Promise<string>;
  updateForStaff(actor: OrganizationActor, input: UpdateComplaintInput): Promise<void>;
}
