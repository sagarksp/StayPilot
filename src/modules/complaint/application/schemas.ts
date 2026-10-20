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

const reportDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid calendar date.");

export const complaintReportFilterSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal("")),
  from: reportDate.optional().or(z.literal("")),
  to: reportDate.optional().or(z.literal("")),
  category: z.enum(complaintCategories).optional().or(z.literal("")),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional().or(z.literal("")),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintForm = z.input<typeof updateComplaintSchema>;
export type UpdateComplaintInput = z.output<typeof updateComplaintSchema>;
