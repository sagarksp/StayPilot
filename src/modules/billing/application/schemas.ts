import { z } from "zod";

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
