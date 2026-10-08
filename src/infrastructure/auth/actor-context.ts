import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "@/infrastructure/db/prisma";
import type { OrganizationActor } from "@/modules/property/domain/inventory";

export async function getOrganizationActor(
  organizationPublicId: string,
): Promise<OrganizationActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) return null;

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      status: "ACTIVE",
      organization: { publicId: organizationPublicId, status: "ACTIVE" },
      user: { email: session.user.email, status: "ACTIVE" },
    },
    select: {
      user: { select: { publicId: true, name: true } },
      organization: {
        select: {
          publicId: true,
          name: true,
          timezone: true,
          _count: {
            select: { properties: { where: { status: { not: "ARCHIVED" } } } },
          },
        },
      },
      roles: { select: { roleCode: true } },
      pgAssignments: {
        where: { status: "ACTIVE", property: { status: "ACTIVE" } },
        select: { property: { select: { publicId: true } } },
      },
    },
  });
  if (!membership) return null;

  const roles = membership.roles
    .map(({ roleCode }) => roleCode)
    .filter((role): role is OrganizationActor["roles"][number] =>
      role === "OWNER" || role === "MANAGER" || role === "RESIDENT",
    );
  if (!roles.length) return null;

  return {
    userId: membership.user.publicId,
    userName: membership.user.name,
    organizationId: membership.organization.publicId,
    organizationName: membership.organization.name,
    organizationTimezone: membership.organization.timezone,
    propertyCount: membership.organization._count.properties,
    roles,
    allowedPgIds: membership.pgAssignments.map(({ property }) => property.publicId),
  };
}
