import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid date.");

export const publishNoticeSchema = z.object({
  propertyId: z.string().uuid().or(z.literal("")),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(5).max(5000),
  expiresOn: date.or(z.literal("")),
});

export const archiveNoticeSchema = z.object({ noticeId: z.string().uuid() });

export type PublishNoticeInput = z.infer<typeof publishNoticeSchema>;
