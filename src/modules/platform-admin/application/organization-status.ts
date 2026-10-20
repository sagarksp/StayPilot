import { z } from "zod";

export const platformOrganizationStatusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().min(10).max(500),
  confirmation: z.literal("yes"),
});

export type PlatformOrganizationStatusInput = z.infer<typeof platformOrganizationStatusSchema>;

export class PlatformOrganizationStatusError extends Error {
  constructor(readonly code: "ORGANIZATION_NOT_FOUND" | "STATUS_UNSUPPORTED" | "STATUS_UNCHANGED" | "STATUS_CONFLICT") {
    super(code);
    this.name = "PlatformOrganizationStatusError";
  }
}

export interface PlatformOrganizationStatusRepository {
  updateStatus(input: PlatformOrganizationStatusInput, adminEmail: string): Promise<void>;
}

export function createPlatformOrganizationStatusUseCases(repository: PlatformOrganizationStatusRepository) {
  return {
    async updateStatus(adminEmail: string, input: unknown) {
      const parsed = platformOrganizationStatusSchema.parse(input);
      return repository.updateStatus(parsed, adminEmail);
    },
  };
}
