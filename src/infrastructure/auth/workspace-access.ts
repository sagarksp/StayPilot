import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { createWorkspaceAccessUseCases } from "@/modules/auth/application/workspace-access";
import type { WorkspaceAccessRepository } from "@/modules/auth/application/workspace-access";

const repository: WorkspaceAccessRepository = {
  async findWorkspaceDestination(email) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
        user: { email, status: "ACTIVE" },
      },
      select: {
        organization: { select: { publicId: true } },
        roles: { select: { roleCode: true } },
      },
      orderBy: { id: "asc" },
    });
    if (!membership) return null;

    const roleCodes = membership.roles.map(({ roleCode }) => roleCode);
    if (!roleCodes.some((role) => role === "OWNER" || role === "MANAGER" || role === "RESIDENT")) {
      return null;
    }

    return {
      organizationId: membership.organization.publicId,
      area: roleCodes.some((role) => role === "OWNER" || role === "MANAGER") ? "staff" : "resident",
    };
  },

  async hasActiveOrganization(email) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
        user: { email, status: "ACTIVE" },
      },
      select: { id: true },
    });
    return membership !== null;
  },
};

export const workspaceAccess = createWorkspaceAccessUseCases(repository);
