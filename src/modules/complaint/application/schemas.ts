import { z } from "zod";
import { complaintCategories } from "../domain/complaint";

export const createComplaintSchema = z.object({
  stayId: z.string().uuid(),
  category: z.enum(complaintCategories),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(4000),
});

export const updateComplaintSchema = z.object({
  complaintId: z.string().uuid(),
  category: z.enum(complaintCategories).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedToId: z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value === undefined ? undefined : value || null),
  resolutionNote: z.string().trim().max(1000).optional().transform((value) => value || null),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintForm = z.input<typeof updateComplaintSchema>;
export type UpdateComplaintInput = z.output<typeof updateComplaintSchema>;
