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
}).refine((value) => value.options.filter(isWillNotEatOption).length <= 1, {
  path: ["options"],
  message: "Add only one Will Not Eat option.",
});

export const voteSchema = z.object({
  pollId: id,
  optionId: id,
  suggestion: z.string().trim().max(500).optional().transform((value) => value || null),
});

export const residentFoodAvailabilitySchema = z.object({
  availabilityId: id.optional().or(z.literal("")),
  startsOn: date,
  endsOn: date,
}).refine((value) => value.startsOn <= value.endsOn, {
  path: ["endsOn"],
  message: "The last away date must be on or after the first date.",
});

export const cancelResidentFoodAvailabilitySchema = z.object({ availabilityId: id });

const menuItemSchema = z.object({
  date,
  mealTypeId: id,
  dishName: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const foodMenuSchema = z.object({
  propertyId: id,
  title: z.string().trim().max(160).optional().or(z.literal("")),
  validFrom: date,
  validTo: date,
  items: z.array(menuItemSchema).min(1).max(300),
}).refine((value) => value.validFrom <= value.validTo, {
  path: ["validTo"],
  message: "The menu end date must be on or after its start date.",
});

export const updateFoodMenuSchema = foodMenuSchema.extend({ menuId: id });
export const foodMenuRangeSchema = z.object({
  from: date.optional(),
  to: date.optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export type MealTypesInput = z.infer<typeof mealTypesSchema>;
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type ResidentFoodAvailabilityInput = z.infer<typeof residentFoodAvailabilitySchema>;
export type CancelResidentFoodAvailabilityInput = z.infer<typeof cancelResidentFoodAvailabilitySchema>;
export type FoodMenuInput = z.infer<typeof foodMenuSchema>;
export type UpdateFoodMenuInput = z.infer<typeof updateFoodMenuSchema>;

export function isWillNotEatOption(label: string) {
  const normalized = label.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return ["will not eat", "i will not eat", "won't eat", "i won't eat", "not eating"].includes(normalized);
}
