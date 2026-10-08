import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined);

export const createPropertySchema = z.object({
  name: z.string().trim().min(2).max(180),
  code: optionalText(50),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: optionalText(255),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  contactPhone: optionalText(30),
  contactEmail: z.union([z.string().trim().email().max(254), z.literal("")]).optional()
    .transform((value) => value || undefined),
});

export const createFloorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  number: z.number().int().min(-5).max(250).nullable().optional(),
});

export const createRoomSchema = z.object({
  floorId: z.string().uuid(),
  number: z.string().trim().min(1).max(50),
});

export const createBedSchema = z.object({
  roomId: z.string().uuid(),
  label: z.string().trim().min(1).max(50),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateBedInput = z.infer<typeof createBedSchema>;
