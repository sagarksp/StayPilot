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
      organization: { publicId: organizationPublicId, status: "ACTIVE", OR: [{ demoExpiresAt: null }, { demoExpiresAt: { gt: new Date() } }] },
      user: { email: session.user.email, status: "ACTIVE" },
    },
    select: {
      user: { select: { publicId: true, name: true, email: true } },
      organization: {
        select: {
          publicId: true,
          name: true,
          timezone: true,
          _count: {
            select: { properties: { where: { status: { not: "ARCHIVED" } } } },
          },
          properties: { where: { status: "ACTIVE" }, select: { publicId: true } },
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
  const allowedPgIds = membership.pgAssignments.map(({ property }) => property.publicId);

  return {
    userId: membership.user.publicId,
    userName: membership.user.name,
    userEmail: membership.user.email,
    organizationId: membership.organization.publicId,
    organizationName: membership.organization.name,
    organizationTimezone: membership.organization.timezone,
    propertyCount: membership.organization._count.properties,
    roles,
    allowedPgIds,
    activePgIds: roles.includes("OWNER") ? membership.organization.properties.map(({ publicId }) => publicId) : allowedPgIds,
  };
}

export async function hasExpiredDemoAccess(organizationPublicId: string): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) return false;
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      status: "ACTIVE",
      organization: { publicId: organizationPublicId, status: "ACTIVE", demoExpiresAt: { lte: new Date() } },
      user: { email: session.user.email, status: "ACTIVE" },
    },
    select: { id: true },
  });
  return membership !== null;
}
