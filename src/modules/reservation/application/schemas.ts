import { z } from "zod";

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
}));

export type CreateReservationData = z.infer<typeof createReservationSchema>;
