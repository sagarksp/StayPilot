import { z } from "zod";
import { rentTermsSchema } from "@/modules/billing/application/schemas";

const phoneSchema = z.string()
  .trim()
  .min(8)
  .max(30)
  .regex(/^[+\d][\d\s().-]*$/, "Enter a valid phone number.");

const emailSchema = z.union([z.string().trim().email().max(254), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const createResidentSchema = z.object({
  name: z.string().trim().min(2).max(180),
  phone: phoneSchema,
  email: emailSchema,
  bedId: z.string().uuid(),
  startDate: z.iso.date(),
}).and(rentTermsSchema);

export const assignResidentBedSchema = z.object({
  bedId: z.string().uuid(),
  startDate: z.iso.date(),
}).and(rentTermsSchema);

export const checkOutResidentSchema = z.object({
  stayId: z.string().uuid(),
  endDate: z.iso.date(),
});

export type CreateResidentForm = z.input<typeof createResidentSchema>;
export type CreateResidentData = z.output<typeof createResidentSchema>;
export type AssignResidentForm = z.input<typeof assignResidentBedSchema>;
export type AssignResidentBedData = z.output<typeof assignResidentBedSchema>;
export type CheckOutResidentData = z.infer<typeof checkOutResidentSchema>;
