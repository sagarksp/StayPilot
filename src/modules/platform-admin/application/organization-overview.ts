export type PlatformOrganizationRecord = Readonly<{
  publicId: string;
  name: string;
  status: string;
  timezone: string;
  createdAt: Date;
  propertyCount: number;
  activeMembershipCount: number;
}>;

export type PlatformOrganizationOverview = Readonly<{
  organizations: readonly PlatformOrganizationRecord[];
  organizationCount: number;
  activeOrganizationCount: number;
  otherOrganizationCount: number;
  propertyCount: number;
  activeMembershipCount: number;
}>;

export interface PlatformAdminOverviewRepository {
  listOrganizations(): Promise<readonly PlatformOrganizationRecord[]>;
}

export function createPlatformAdminOverviewUseCases(repository: PlatformAdminOverviewRepository) {
  return {
    async getOverview(): Promise<PlatformOrganizationOverview> {
      const organizations = await repository.listOrganizations();
      return {
        organizations,
        organizationCount: organizations.length,
        activeOrganizationCount: organizations.filter((organization) => organization.status === "ACTIVE").length,
        otherOrganizationCount: organizations.filter((organization) => organization.status !== "ACTIVE").length,
        propertyCount: organizations.reduce((total, organization) => total + organization.propertyCount, 0),
        activeMembershipCount: organizations.reduce((total, organization) => total + organization.activeMembershipCount, 0),
      };
    },
  };
}
