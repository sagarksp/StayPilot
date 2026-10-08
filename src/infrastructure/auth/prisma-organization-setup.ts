import "server-only";
import type { OrganizationSetupRepository } from "@/modules/auth/application/setup-organization";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaOrganizationSetup: OrganizationSetupRepository = {
  async setupOrganization({ email, ownerName, organizationName }) {
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

      const organization = await transaction.organization.create({
        data: {
          name: organizationName,
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
