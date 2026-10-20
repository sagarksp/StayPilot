import { z } from "zod";
import { residentDocumentTypes } from "../domain/resident-document";

export const uploadResidentDocumentSchema = z.object({
  documentType: z.enum(residentDocumentTypes),
});

export const reviewResidentDocumentSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional().transform((value) => value || undefined),
}).superRefine((value, context) => {
  if (value.status === "REJECTED" && !value.reviewNote) {
    context.addIssue({ code: "custom", path: ["reviewNote"], message: "A reason is required when rejecting a document." });
  }
});
