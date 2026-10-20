import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { createPlatformAdminOverviewUseCases, type PlatformAdminOverviewRepository } from "@/modules/platform-admin/application/organization-overview";

const repository: PlatformAdminOverviewRepository = {
  async listOrganizations() {
    const organizations = await prisma.organization.findMany({
      select: {
        publicId: true,
        name: true,
        status: true,
        timezone: true,
        createdAt: true,
        _count: {
          select: {
            properties: { where: { status: { not: "ARCHIVED" } } },
            memberships: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return organizations.map((organization) => ({
      publicId: organization.publicId,
      name: organization.name,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.createdAt,
      propertyCount: organization._count.properties,
      activeMembershipCount: organization._count.memberships,
    }));
  },
  async listProperties() {
    const properties = await prisma.property.findMany({
      select: { publicId: true, name: true, status: true, createdAt: true, organization: { select: { publicId: true, name: true } } },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    });
    return properties.map((property) => ({ publicId: property.publicId, organizationId: property.organization.publicId, organizationName: property.organization.name, name: property.name, status: property.status, createdAt: property.createdAt }));
  },
};

export const platformAdminOverview = createPlatformAdminOverviewUseCases(repository);
