import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().uuid();
const rowId = z.string().regex(/^\d+$/);

const validDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const electricityReportFilterSchema = z.object({
  propertyId: id.optional().or(z.literal("")),
  from: date.refine(validDate, "Choose a valid start date.").optional().or(z.literal("")),
  to: date.refine(validDate, "Choose a valid end date.").optional().or(z.literal("")),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export const meterSchema = z.object({
  propertyId: id,
  scopeType: z.enum(["ROOM", "FLOOR"]),
  scopeId: id,
  meterNumber: z.string().trim().min(1).max(100),
  installedOn: date.optional().or(z.literal("")),
});

export const readingSchema = z.object({
  meterId: id,
  readingValue: z.string().trim().regex(/^\d{1,11}(\.\d{1,3})?$/),
  readingAt: date,
});

export const meterStatusSchema = z.object({
  meterId: id,
  status: z.enum(["REPLACED", "INACTIVE"]),
});

export const electricitySettingsSchema = z.object({
  propertyId: id,
  electricityMode: z.enum(["ROOM_METER", "FLOOR_METER", "MANUAL"]),
  defaultUnitRate: z.string().trim().regex(/^\d{1,8}(\.\d{1,2})?$/).optional().or(z.literal("")),
});

export const billSchema = z.object({
  propertyId: id,
  billingMode: z.enum(["ROOM_METER", "FLOOR_METER", "MANUAL"]),
  meterId: id.optional().or(z.literal("")),
  previousReadingId: rowId.optional().or(z.literal("")),
  currentReadingId: rowId.optional().or(z.literal("")),
  periodStart: date,
  periodEnd: date,
  unitRate: z.string().trim().regex(/^\d{1,8}(\.\d{1,2})?$/).optional().or(z.literal("")),
  totalAmount: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).optional().or(z.literal("")),
}).refine((value) => value.periodStart <= value.periodEnd, { path: ["periodEnd"] });

export const overrideSchema = z.object({
  allocationId: id,
  amount: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/),
  reason: z.string().trim().min(3).max(500),
});
