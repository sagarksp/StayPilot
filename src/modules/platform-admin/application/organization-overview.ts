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
  properties: readonly PlatformPropertyRecord[];
  organizationCount: number;
  activeOrganizationCount: number;
  otherOrganizationCount: number;
  propertyCount: number;
  activeMembershipCount: number;
}>;

export type PlatformPropertyRecord = Readonly<{
  publicId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  status: string;
  createdAt: Date;
}>;

export interface PlatformAdminOverviewRepository {
  listOrganizations(): Promise<readonly PlatformOrganizationRecord[]>;
  listProperties(): Promise<readonly PlatformPropertyRecord[]>;
}

export function createPlatformAdminOverviewUseCases(repository: PlatformAdminOverviewRepository) {
  return {
    async getOverview(): Promise<PlatformOrganizationOverview> {
      const [organizations, properties] = await Promise.all([repository.listOrganizations(), repository.listProperties()]);
      return {
        organizations,
        properties,
        organizationCount: organizations.length,
        activeOrganizationCount: organizations.filter((organization) => organization.status === "ACTIVE").length,
        otherOrganizationCount: organizations.filter((organization) => organization.status !== "ACTIVE").length,
        propertyCount: organizations.reduce((total, organization) => total + organization.propertyCount, 0),
        activeMembershipCount: organizations.reduce((total, organization) => total + organization.activeMembershipCount, 0),
      };
    },
  };
}
