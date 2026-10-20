import { z } from "zod";

const reportDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid calendar date.");

export const reservationReportFilterSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal("")),
  from: reportDate.optional().or(z.literal("")),
  to: reportDate.optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "MOVED_IN", "CANCELLED", "EXPIRED"]).optional().or(z.literal("")),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  path: ["to"],
  message: "The end date must be on or after the start date.",
});

export type ReservationReportFilters = z.infer<typeof reservationReportFilterSchema>;

export const createReservationSchema = z.object({
  residentId: z.union([z.string().uuid(), z.literal("")]).optional(),
  newResidentName: z.string().trim().max(180).optional().transform((value) => value || undefined),
  newResidentPhone: z.union([z.string().trim().max(30).regex(/^[+\d][\d\s().-]*$/), z.literal("")]).optional().transform((value) => value || undefined),
  newResidentEmail: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  bedId: z.string().uuid(),
  reservationStartDate: z.iso.date(),
  reservationEndDate: z.iso.date(),
  expectedMoveInDate: z.iso.date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  securityDepositReceived: z.union([z.literal(""), z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/)]).optional(),
  depositPaymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).optional().default("UPI"),
  depositPaymentDate: z.union([z.iso.date(), z.literal("")]).optional(),
  depositPaymentReference: z.string().trim().max(100).optional(),
}).superRefine((data, context) => {
  if (!data.residentId && (!data.newResidentName || data.newResidentName.length < 2 || !data.newResidentPhone || data.newResidentPhone.length < 8)) {
    context.addIssue({ code: "custom", path: ["newResidentName"], message: "New resident details required" });
  }
  if (data.reservationEndDate < data.reservationStartDate) {
    context.addIssue({ code: "custom", path: ["reservationEndDate"], message: "Date order" });
  }
  if (data.expectedMoveInDate && (data.expectedMoveInDate < data.reservationStartDate || data.expectedMoveInDate > data.reservationEndDate)) {
    context.addIssue({ code: "custom", path: ["expectedMoveInDate"], message: "Move-in must be inside the reservation period" });
  }
}).transform((data) => ({
  ...data,
  residentId: data.residentId || undefined,
  newResidentName: data.newResidentName || undefined,
  newResidentPhone: data.newResidentPhone || undefined,
  newResidentEmail: data.newResidentEmail || undefined,
  expectedMoveInDate: data.expectedMoveInDate || undefined,
  notes: data.notes || undefined,
  securityDepositReceivedPaise: data.securityDepositReceived ? (() => { const [rupees, paise = ""] = data.securityDepositReceived.split("."); return BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0")); })() : BigInt(0),
  depositPaymentReference: data.depositPaymentReference || undefined,
  depositPaymentDate: data.depositPaymentDate || undefined,
}));

export type CreateReservationData = z.infer<typeof createReservationSchema>;
export type CreateReservationForm = z.input<typeof createReservationSchema>;
