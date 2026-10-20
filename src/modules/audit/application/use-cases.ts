import { prisma } from "@/infrastructure/db/prisma";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}

export const auditUseCases = {
  async listRecent(actor: OrganizationActor) {
    assertStaff(actor);
    const organization = await prisma.organization.findUnique({
      where: { publicId: actor.organizationId },
      select: { id: true },
    });
    if (!organization) return [];

    const propertyIds = actor.roles.includes("OWNER")
      ? undefined
      : (await prisma.property.findMany({
        where: { organizationId: organization.id, publicId: { in: [...actor.allowedPgIds] } },
        select: { id: true },
      })).map(({ id }) => id);

    return prisma.auditLog.findMany({
      where: {
        organizationId: organization.id,
        ...(propertyIds ? { propertyId: { in: propertyIds } } : {}),
      },
      select: {
        publicId: true,
        propertyId: true,
        actionCode: true,
        entityType: true,
        entityPublicId: true,
        actorName: true,
        summary: true,
        createdAt: true,
        property: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  },
};
