import { z } from "zod";

export const platformPropertyStatusSchema = z.object({
  propertyId: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  reason: z.string().trim().min(10).max(500),
  confirmation: z.literal("yes"),
});
export type PlatformPropertyStatusInput = z.infer<typeof platformPropertyStatusSchema>;

export class PlatformPropertyStatusError extends Error {
  constructor(readonly code: "PROPERTY_NOT_FOUND" | "ORGANIZATION_INACTIVE" | "STATUS_UNCHANGED" | "STATUS_CONFLICT") {
    super(code);
    this.name = "PlatformPropertyStatusError";
  }
}

export interface PlatformPropertyStatusRepository {
  updateStatus(input: PlatformPropertyStatusInput, adminEmail: string): Promise<void>;
}

export function createPlatformPropertyStatusUseCases(repository: PlatformPropertyStatusRepository) {
  return {
    async updateStatus(adminEmail: string, input: unknown) {
      return repository.updateStatus(platformPropertyStatusSchema.parse(input), adminEmail);
    },
  };
}
