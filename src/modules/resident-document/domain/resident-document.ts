export const residentDocumentTypes = ["GOVERNMENT_ID", "ADDRESS_PROOF", "PROFILE_PHOTO", "OTHER"] as const;
export type ResidentDocumentType = typeof residentDocumentTypes[number];
export type ResidentDocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type ResidentDocumentSummary = Readonly<{
  id: string;
  type: ResidentDocumentType;
  status: ResidentDocumentStatus;
  name: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  uploadedByName?: string;
  reviewedByName?: string | null;
}>;

export class ResidentDocumentError extends Error {
  constructor(readonly code: "STORAGE_NOT_CONFIGURED" | "INVALID_FILE" | "FILE_TOO_LARGE" | "DOCUMENT_LIMIT" | "DOCUMENT_NOT_FOUND" | "REVIEW_NOT_ALLOWED") {
    super(code);
    this.name = "ResidentDocumentError";
  }
}
