import { z } from "zod";
import { rentTermsSchema, securityDepositTermsSchema } from "@/modules/billing/application/schemas";

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
}).and(rentTermsSchema).and(securityDepositTermsSchema);

export const assignResidentBedSchema = z.object({
  bedId: z.string().uuid(),
  startDate: z.iso.date(),
}).and(rentTermsSchema).and(securityDepositTermsSchema);

export const updateResidentEmailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

export const checkOutResidentSchema = z.object({
  stayId: z.string().uuid(),
  endDate: z.iso.date(),
  rentExitPolicy: z.enum(["FULL_CYCLE", "PRORATED"]),
  paymentDate: z.iso.date(),
  additionalPayment: z.union([z.literal(""), z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/)]).optional(),
  additionalPaymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("CASH"),
  earlyExitCharge: z.union([z.literal(""), z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/)]).optional(),
  earlyExitChargeReason: z.string().trim().max(500).optional(),
  damageDeduction: z.union([z.literal(""), z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/)]).optional(),
  damageReason: z.string().trim().max(500).optional(),
  depositRefundMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("UPI"),
  reference: z.string().trim().max(100).optional(),
}).superRefine((data, context) => {
  if (data.damageDeduction && !data.damageReason?.trim()) context.addIssue({ code: "custom", path: ["damageReason"], message: "A reason is required for a damage deduction." });
  if (data.earlyExitCharge && !data.earlyExitChargeReason?.trim()) context.addIssue({ code: "custom", path: ["earlyExitChargeReason"], message: "A reason is required for an early-exit charge." });
}).transform((data) => {
  const toPaise = (amount: string | undefined) => {
    if (!amount) return BigInt(0);
    const [rupees, paise = ""] = amount.split(".");
    return BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  };
  return {
    ...data,
    paymentDate: new Date(`${data.paymentDate}T00:00:00.000Z`),
    additionalPaymentPaise: toPaise(data.additionalPayment),
    earlyExitChargePaise: toPaise(data.earlyExitCharge),
    earlyExitChargeReason: data.earlyExitChargeReason?.trim() || null,
    damageDeductionPaise: toPaise(data.damageDeduction),
    damageReason: data.damageReason?.trim() || null,
    reference: data.reference?.trim() || null,
  };
});

export const moveOutNoticeSchema = z.object({
  stayId: z.string().uuid(),
  requestedCheckoutDate: z.iso.date(),
  lockInOverrideReason: z.union([z.string().trim().min(3).max(500), z.literal("")]).optional().transform((value) => value || null),
});

export const securityDepositTransferSchema = z.object({
  sourceStayId: z.string().uuid(),
  destinationStayId: z.string().uuid(),
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  reason: z.string().trim().min(3).max(400),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.amount.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise < BigInt(1)) context.addIssue({ code: "custom", path: ["amount"], message: "Enter a positive transfer amount." });
  if (value.sourceStayId === value.destinationStayId) context.addIssue({ code: "custom", path: ["destinationStayId"], message: "Choose a different destination stay." });
  return { ...value, amountPaise };
});

export type CreateResidentForm = z.input<typeof createResidentSchema>;
export type CreateResidentData = z.output<typeof createResidentSchema>;
export type AssignResidentForm = z.input<typeof assignResidentBedSchema>;
export type AssignResidentBedData = z.output<typeof assignResidentBedSchema>;
export type CheckOutResidentData = z.infer<typeof checkOutResidentSchema>;
export type CheckOutResidentForm = z.input<typeof checkOutResidentSchema>;
export type MoveOutNoticeForm = z.input<typeof moveOutNoticeSchema>;
export type MoveOutNoticeInput = z.output<typeof moveOutNoticeSchema>;
export type SecurityDepositTransferForm = z.input<typeof securityDepositTransferSchema>;
export type SecurityDepositTransferInput = z.output<typeof securityDepositTransferSchema>;
