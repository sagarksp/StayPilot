import { z } from "zod";

const id = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid date.");

export const mealTypesSchema = z.object({
  propertyId: id,
  mealTypes: z.array(z.string().trim().min(1).max(80)).max(12),
});

export const createPollSchema = z.object({
  propertyId: id,
  mealTypeId: id,
  mealDate: date,
  closesAt: z.string().datetime({ offset: true }),
  options: z.array(z.string().trim().min(1).max(180)).min(2).max(12),
}).refine((value) => new Set(value.options.map((option) => option.toLowerCase())).size === value.options.length, {
  path: ["options"],
  message: "Poll options must be unique.",
});

export const voteSchema = z.object({ pollId: id, optionId: id });

export type MealTypesInput = z.infer<typeof mealTypesSchema>;
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
