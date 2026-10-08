import { z } from "zod";

const organizationNameSchema = z.string().trim().min(2).max(200);

export interface OrganizationSetupRepository {
  setupOrganization(input: Readonly<{ email: string; ownerName: string; organizationName: string }>): Promise<string>;
}

export function createOrganizationSetup(repository: OrganizationSetupRepository) {
  return async (input: Readonly<{ email: string; ownerName: string; organizationName: string }>) => {
    const parsed = organizationNameSchema.parse(input.organizationName);
    return repository.setupOrganization({
      email: input.email.trim().toLowerCase(),
      ownerName: input.ownerName.trim(),
      organizationName: parsed,
    });
  };
}
