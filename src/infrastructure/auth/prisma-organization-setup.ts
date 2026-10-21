import "server-only";
import type { OrganizationSetupRepository } from "@/modules/auth/application/setup-organization";
import { prisma } from "@/infrastructure/db/prisma";
import { acceptPlatformOwnerInvitation } from "@/infrastructure/platform-admin/owner-invitations";

export const prismaOrganizationSetup: OrganizationSetupRepository = {
  async setupOrganization({ email, ownerName, organizationName, ownerInviteToken }) {
    if (!ownerInviteToken) throw new Error("OWNER_INVITATION_INVALID");
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.upsert({
        where: { email },
        create: { email, name: ownerName.slice(0, 180) || email, status: "ACTIVE" },
        update: {},
      });
      if (user.status !== "ACTIVE") throw new Error("ACCOUNT_NOT_ACTIVE");

      const existingMembership = await transaction.organizationMembership.findFirst({
        where: {
          status: "ACTIVE",
          userId: user.id,
          organization: { status: "ACTIVE" },
        },
        select: { organization: { select: { publicId: true } } },
      });
      if (existingMembership) return existingMembership.organization.publicId;

      const demoDurationHours = await acceptPlatformOwnerInvitation({ token: ownerInviteToken, email }, transaction);

      const organization = await transaction.organization.create({
        data: {
          name: organizationName,
          demoExpiresAt: demoDurationHours ? new Date(Date.now() + demoDurationHours * 60 * 60 * 1000) : null,
          memberships: {
            create: {
              userId: user.id,
              status: "ACTIVE",
              roles: { create: { roleCode: "OWNER" } },
            },
          },
        },
        select: { publicId: true },
      });
      return organization.publicId;
    });
  },
};
