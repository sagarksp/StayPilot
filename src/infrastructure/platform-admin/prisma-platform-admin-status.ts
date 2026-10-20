import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { recordAuditEvent } from "@/modules/audit/application/events";
import { createPlatformOrganizationStatusUseCases, PlatformOrganizationStatusError, type PlatformOrganizationStatusRepository } from "@/modules/platform-admin/application/organization-status";

const repository: PlatformOrganizationStatusRepository = {
  async updateStatus(input, adminEmail) {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { publicId: input.organizationId },
        select: { id: true, publicId: true, name: true, status: true },
      });
      if (!organization) throw new PlatformOrganizationStatusError("ORGANIZATION_NOT_FOUND");
      if (organization.status !== "ACTIVE" && organization.status !== "SUSPENDED") {
        throw new PlatformOrganizationStatusError("STATUS_UNSUPPORTED");
      }
      if (organization.status === input.status) throw new PlatformOrganizationStatusError("STATUS_UNCHANGED");

      const updated = await tx.organization.updateMany({
        where: { id: organization.id, status: organization.status },
        data: { status: input.status },
      });
      if (updated.count !== 1) throw new PlatformOrganizationStatusError("STATUS_CONFLICT");

      const actionCode = input.status === "SUSPENDED" ? "PLATFORM_ORGANIZATION_SUSPENDED" : "PLATFORM_ORGANIZATION_REACTIVATED";
      const verb = input.status === "SUSPENDED" ? "suspended" : "reactivated";
      await recordAuditEvent(tx, {
        organizationId: organization.id,
        actorUserPublicId: null,
        actorName: adminEmail,
        actionCode,
        entityType: "ORGANIZATION",
        entityPublicId: organization.publicId,
        summary: `Platform administrator ${adminEmail} ${verb} this organization. Reason: ${input.reason}`,
      });
    });
  },
};

export const platformOrganizationStatus = createPlatformOrganizationStatusUseCases(repository);
