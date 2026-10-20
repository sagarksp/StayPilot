import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { recordAuditEvent } from "@/modules/audit/application/events";
import { createPlatformPropertyStatusUseCases, PlatformPropertyStatusError, type PlatformPropertyStatusRepository } from "@/modules/platform-admin/application/property-status";

const repository: PlatformPropertyStatusRepository = {
  async updateStatus(input, adminEmail) {
    await prisma.$transaction(async (tx) => {
      const property = await tx.property.findUnique({ where: { publicId: input.propertyId }, select: { id: true, publicId: true, name: true, status: true, organizationId: true, organization: { select: { status: true } } } });
      if (!property) throw new PlatformPropertyStatusError("PROPERTY_NOT_FOUND");
      if (property.organization.status !== "ACTIVE") throw new PlatformPropertyStatusError("ORGANIZATION_INACTIVE");
      if (property.status !== "ACTIVE" && property.status !== "INACTIVE") throw new PlatformPropertyStatusError("STATUS_UNCHANGED");
      if (property.status === input.status) throw new PlatformPropertyStatusError("STATUS_UNCHANGED");
      const result = await tx.property.updateMany({ where: { id: property.id, status: property.status }, data: { status: input.status } });
      if (result.count !== 1) throw new PlatformPropertyStatusError("STATUS_CONFLICT");
      const disabled = input.status === "INACTIVE";
      await recordAuditEvent(tx, {
        organizationId: property.organizationId,
        propertyId: property.id,
        actorUserPublicId: null,
        actorName: adminEmail,
        actionCode: disabled ? "PLATFORM_PROPERTY_DEACTIVATED" : "PLATFORM_PROPERTY_REACTIVATED",
        entityType: "PROPERTY",
        entityPublicId: property.publicId,
        summary: `Platform administrator ${adminEmail} ${disabled ? "deactivated" : "reactivated"} PG ${property.name}. Reason: ${input.reason}`,
      });
    });
  },
};

export const platformPropertyStatus = createPlatformPropertyStatusUseCases(repository);
