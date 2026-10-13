export const complaintCategories = ["ELECTRICITY", "PLUMBING", "CLEANING", "FOOD", "WIFI", "FURNITURE", "SECURITY", "OTHER"] as const;
export type ComplaintCategory = typeof complaintCategories[number];
export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type ComplaintEventSummary = Readonly<{
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorName: string;
  createdAt: Date;
}>;

export type ComplaintSummary = Readonly<{
  id: string;
  stayId: string;
  propertyId: string;
  propertyName: string;
  residentName: string;
  roomNumber: string;
  bedLabel: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  status: ComplaintStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  assignees: readonly Readonly<{ id: string; name: string }>[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  events: readonly ComplaintEventSummary[];
}>;

export class ComplaintWorkflowError extends Error {
  constructor(readonly code: "COMPLAINT_NOT_FOUND" | "STAY_NOT_ACTIVE" | "INVALID_STATUS_TRANSITION" | "ASSIGNEE_NOT_ALLOWED" | "RESOLUTION_NOTE_REQUIRED") {
    super(code);
    this.name = "ComplaintWorkflowError";
  }
}
