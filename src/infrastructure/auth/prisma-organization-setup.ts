import "server-only";
import type { OrganizationSetupRepository } from "@/modules/auth/application/setup-organization";
import { prisma } from "@/infrastructure/db/prisma";
import { acceptPlatformOwnerInvitation } from "@/infrastructure/platform-admin/owner-invitations";

export const prismaOrganizationSetup: OrganizationSetupRepository = {
  async setupOrganization({ email, ownerName, organizationName, ownerInviteToken }) {
    if (!ownerInviteToken) throw new Error("OWNER_INVITATION_INVALID");
    return prisma.$transaction(async (transaction) => {
      let operation = "owner_user_upsert";
      try {
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

        operation = "owner_invitation_accept";
        const demoDurationHours = await acceptPlatformOwnerInvitation({ token: ownerInviteToken, email }, transaction);

        operation = "organization_create";
        const organization = await transaction.organization.create({
          data: {
            name: organizationName,
            demoExpiresAt: demoDurationHours ? new Date(Date.now() + demoDurationHours * 60 * 60 * 1000) : null,
          },
          select: { id: true, publicId: true },
        });

        operation = "owner_membership_create";
        const membership = await transaction.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            residentId: null,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        operation = "owner_role_create";
        await transaction.membershipRole.create({
          data: { membershipId: membership.id, roleCode: "OWNER" },
        });

        return organization.publicId;
      } catch (error) {
        const prismaError = error as { code?: unknown; meta?: unknown };
        console.error("[owner-setup] Organization setup transaction failed", {
          operation,
          code: prismaError.code,
          meta: prismaError.meta,
        });
        throw error;
      }
    });
  },
};
