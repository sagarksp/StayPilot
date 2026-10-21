import { z } from "zod";

const organizationNameSchema = z.string().trim().min(2).max(200);

export interface OrganizationSetupRepository {
  setupOrganization(input: Readonly<{ email: string; ownerName: string; organizationName: string; ownerInviteToken: string }>): Promise<string>;
}

export function createOrganizationSetup(repository: OrganizationSetupRepository) {
  return async (input: Readonly<{ email: string; ownerName: string; organizationName: string; ownerInviteToken: string }>) => {
    if (!input.ownerInviteToken.trim()) throw new Error("OWNER_INVITATION_INVALID");
    const parsed = organizationNameSchema.parse(input.organizationName);
    return repository.setupOrganization({
      email: input.email.trim().toLowerCase(),
      ownerName: input.ownerName.trim(),
      organizationName: parsed,
      ownerInviteToken: input.ownerInviteToken,
    });
  };
}
