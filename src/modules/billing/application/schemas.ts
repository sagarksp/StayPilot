import { z } from "zod";

const reportDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid calendar date.");

export const financeReportFilterSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal("")),
  from: reportDate.optional().or(z.literal("")),
  to: reportDate.optional().or(z.literal("")),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export type FinanceReportFilters = z.infer<typeof financeReportFilterSchema>;

export const depositReportFilterSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal("")),
  from: reportDate.optional().or(z.literal("")),
  to: reportDate.optional().or(z.literal("")),
  transactionType: z.enum(["RECEIPT", "TRANSFER_IN", "TRANSFER_OUT", "DEDUCTION", "REFUND", "RENT_CREDIT"]).optional().or(z.literal("")),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export type DepositReportFilters = z.infer<typeof depositReportFilterSchema>;

export const rentTermsSchema = z.object({
  monthlyRent: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a rent amount with up to two decimal places."),
  billingCycleType: z.enum(["MOVE_IN_DAY", "FIXED_DAY"]).default("MOVE_IN_DAY"),
  billingDay: z.union([z.literal(""), z.string().regex(/^([1-9]|[12]\d|3[01])$/)]).optional(),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.monthlyRent.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise < BigInt(1) || amountPaise > BigInt("9000000000000000")) {
    context.addIssue({ code: "custom", path: ["monthlyRent"], message: "Enter a positive rent amount." });
  }
  if (value.billingCycleType === "FIXED_DAY" && !value.billingDay) {
    context.addIssue({ code: "custom", path: ["billingDay"], message: "Choose a monthly billing day." });
  }
  return {
    amountPaise,
    billingCycleType: value.billingCycleType,
    billingDay: value.billingCycleType === "FIXED_DAY" ? Number(value.billingDay) : null,
  };
});

export type RentTermsInput = z.input<typeof rentTermsSchema>;
export type RentTerms = z.output<typeof rentTermsSchema>;

export const securityDepositTermsSchema = z.object({
  requiredSecurityDeposit: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a deposit amount with up to two decimal places."),
  depositPolicyType: z.enum(["FULL_MONTH", "HALF_MONTH", "FIXED", "CUSTOM"]),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.requiredSecurityDeposit.split(".");
  const requiredAmountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (requiredAmountPaise > BigInt("9000000000000000")) {
    context.addIssue({ code: "custom", path: ["requiredSecurityDeposit"], message: "Enter a valid deposit amount." });
  }
  return { requiredAmountPaise, depositPolicyType: value.depositPolicyType };
});

export type SecurityDepositTermsInput = z.input<typeof securityDepositTermsSchema>;
export type SecurityDepositTerms = z.output<typeof securityDepositTermsSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1).max(36),
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter an amount with up to two decimal places."),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid payment date.").refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Choose a valid payment date."),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().trim().max(100).optional().transform((value) => value || null),
  notes: z.string().trim().max(500).optional().transform((value) => value || null),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.amount.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise < BigInt(1) || amountPaise > BigInt("9000000000000000")) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Enter a positive payment amount." });
  }
  return { ...value, amountPaise, paymentDate: new Date(`${value.paymentDate}T00:00:00.000Z`) };
});

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
export type RecordPayment = z.output<typeof recordPaymentSchema>;

const positivePaise = z.union([
  z.number().int().positive().max(9_000_000_000_000_000).transform((value) => BigInt(value)),
  z.string().regex(/^[1-9]\d{0,15}$/).transform((value) => BigInt(value)),
]).refine((value) => value <= BigInt("9000000000000000"), "Enter a valid reversal amount.");

export const reversePaymentSchema = z.object({
  amountPaise: positivePaise,
  reason: z.string().trim().min(3).max(500),
});

export const reversePaymentFormSchema = z.object({
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  reason: z.string().trim().min(3).max(500),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.amount.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise < BigInt(1) || amountPaise > BigInt("9000000000000000")) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Enter a positive reversal amount." });
  }
  return { amountPaise, reason: value.reason };
});

export type ReversePaymentInput = z.output<typeof reversePaymentSchema>;
export type ReversePaymentForm = z.output<typeof reversePaymentFormSchema>;

export const recordSecurityDepositReceiptSchema = z.object({
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  paymentDate: z.iso.date(),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().trim().max(100).optional().transform((value) => value || null),
}).transform((value, context) => {
  const [rupees, paise = ""] = value.amount.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise < BigInt(1)) context.addIssue({ code: "custom", path: ["amount"], message: "Enter a positive payment amount." });
  return { ...value, amountPaise, paymentDate: new Date(`${value.paymentDate}T00:00:00.000Z`) };
});
export type RecordSecurityDepositReceiptInput = z.input<typeof recordSecurityDepositReceiptSchema>;
export type RecordSecurityDepositReceipt = z.output<typeof recordSecurityDepositReceiptSchema>;
