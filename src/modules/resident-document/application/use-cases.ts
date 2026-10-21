import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { recordAuditEvent } from "@/modules/audit/application/events";
import { createNotifications } from "@/modules/notification/application/use-cases";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { ResidentDocumentError, type ResidentDocumentSummary } from "../domain/resident-document";
import { reviewResidentDocumentSchema, uploadResidentDocumentSchema } from "./schemas";
import { getResidentDocumentDownloadUrl, MAX_ACTIVE_RESIDENT_DOCUMENTS, putResidentDocument } from "../infrastructure/private-storage";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}

function managerPropertyFilter(actor: OrganizationActor) {
  return [...actor.activePgIds];
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toSummary(record: {
  publicId: string;
  documentType: string;
  status: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  uploadedBy?: { name: string };
  reviewedBy?: { name: string } | null;
}): ResidentDocumentSummary {
  return {
    id: record.publicId,
    type: record.documentType as ResidentDocumentSummary["type"],
    status: record.status as ResidentDocumentSummary["status"],
    name: record.originalName,
    contentType: record.contentType,
    byteSize: record.byteSize,
    createdAt: record.createdAt,
    reviewedAt: record.reviewedAt,
    reviewNote: record.reviewNote,
    ...(record.uploadedBy ? { uploadedByName: record.uploadedBy.name } : {}),
    ...(record.reviewedBy ? { reviewedByName: record.reviewedBy.name } : {}),
  };
}

async function findSelfResident(actor: OrganizationActor) {
  if (!actor.roles.includes("RESIDENT")) throw new AccessDeniedError();
  const today = new Date(`${todayInTimezone(actor.organizationTimezone)}T00:00:00.000Z`);
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organization: { publicId: actor.organizationId, status: "ACTIVE" },
      user: { publicId: actor.userId, status: "ACTIVE" },
      status: "ACTIVE",
      residentId: { not: null },
      roles: { some: { roleCode: "RESIDENT" } },
    },
    select: {
      organization: { select: { id: true, publicId: true } },
      user: { select: { id: true } },
      resident: { select: { id: true, publicId: true, stays: { where: { property: { status: "ACTIVE" }, status: { in: ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, orderBy: { startDate: "desc" }, take: 1, select: { propertyId: true } } } },
    },
  });
  if (!membership?.resident) throw new AccessDeniedError();
  return { organization: membership.organization, user: membership.user, resident: membership.resident };
}

async function findStaffResident(actor: OrganizationActor, residentPublicId: string) {
  assertStaff(actor);
  const propertyIds = managerPropertyFilter(actor);
  const resident = await prisma.resident.findFirst({
    where: {
      publicId: residentPublicId,
      organization: { publicId: actor.organizationId, status: "ACTIVE" },
      ...(propertyIds ? { OR: [
        { stays: { some: { property: { publicId: { in: propertyIds } } } } },
        { reservations: { some: { property: { publicId: { in: propertyIds } } } } },
      ] } : {}),
    },
    select: {
      id: true,
      organizationId: true,
      publicId: true,
      name: true,
      stays: {
        where: propertyIds ? { property: { publicId: { in: propertyIds } } } : {},
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        take: 1,
        select: { propertyId: true },
      },
    },
  });
  if (!resident) throw new AccessDeniedError();
  return resident;
}

async function listResidentDocuments(organizationId: bigint, residentId: bigint, withStaffNames: boolean, propertyIds?: readonly string[]) {
  const records = await prisma.residentDocument.findMany({
    where: { organizationId, residentId, ...(propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {}) },
    select: {
      publicId: true,
      documentType: true,
      status: true,
      originalName: true,
      contentType: true,
      byteSize: true,
      createdAt: true,
      reviewedAt: true,
      reviewNote: true,
      ...(withStaffNames ? { uploadedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return records.map(toSummary);
}

export const residentDocumentUseCases = {
  async listForResident(actor: OrganizationActor) {
    const scope = await findSelfResident(actor);
    return listResidentDocuments(scope.organization.id, scope.resident.id, false);
  },

  async uploadForResident(actor: OrganizationActor, input: unknown, file: File) {
    const { documentType } = uploadResidentDocumentSchema.parse(input);
    const scope = await findSelfResident(actor);
    const propertyId = scope.resident.stays[0]?.propertyId;
    if (!propertyId) throw new AccessDeniedError();
    const stored = await putResidentDocument(scope.organization.publicId, scope.resident.publicId, file);
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM residents WHERE id = ${scope.resident.id} FOR UPDATE`;
        const activeCount = await tx.residentDocument.count({
          where: { organizationId: scope.organization.id, residentId: scope.resident.id, status: { in: ["PENDING", "VERIFIED"] } },
        });
        if (activeCount >= MAX_ACTIVE_RESIDENT_DOCUMENTS) throw new ResidentDocumentError("DOCUMENT_LIMIT");
        const record = await tx.residentDocument.create({
          data: {
            organizationId: scope.organization.id,
            residentId: scope.resident.id,
            propertyId,
            uploadedById: scope.user.id,
            documentType,
            objectKey: stored.objectKey,
            originalName: stored.originalName,
            contentType: stored.contentType,
            byteSize: stored.byteSize,
          },
          select: { publicId: true, documentType: true, status: true, originalName: true, contentType: true, byteSize: true, createdAt: true, reviewedAt: true, reviewNote: true },
        });
        await recordAuditEvent(tx, {
          organizationId: scope.organization.id,
          propertyId,
          actorUserPublicId: actor.userId,
          actorName: actor.userName,
          actionCode: "KYC_DOCUMENT_UPLOADED",
          entityType: "RESIDENT_DOCUMENT",
          entityPublicId: record.publicId,
          summary: `Resident uploaded a ${documentType.toLowerCase().replaceAll("_", " ")} document.`,
        });
        return toSummary(record);
      });
      return result;
    } catch (error) {
      await stored.cleanup();
      throw error;
    }
  },

  async listForStaff(actor: OrganizationActor, residentPublicId: string) {
    const resident = await findStaffResident(actor, residentPublicId);
    return listResidentDocuments(resident.organizationId, resident.id, true, managerPropertyFilter(actor));
  },

  async reviewForStaff(actor: OrganizationActor, residentPublicId: string, documentPublicId: string, input: unknown) {
    const parsed = reviewResidentDocumentSchema.parse(input);
    const resident = await findStaffResident(actor, residentPublicId);
    const document = await prisma.residentDocument.findFirst({
      where: { publicId: documentPublicId, organizationId: resident.organizationId, residentId: resident.id, status: "PENDING", ...(managerPropertyFilter(actor) ? { property: { publicId: { in: managerPropertyFilter(actor) } } } : {}) },
      select: { id: true, publicId: true, documentType: true, organizationId: true, residentId: true, propertyId: true },
    });
    if (!document) throw new ResidentDocumentError("REVIEW_NOT_ALLOWED");

    await prisma.$transaction(async (tx) => {
      const reviewer = await tx.user.findUnique({ where: { publicId: actor.userId }, select: { id: true } });
      if (!reviewer) throw new AccessDeniedError();
      const updated = await tx.residentDocument.updateMany({
        where: { id: document.id, status: "PENDING" },
        data: { status: parsed.status, reviewNote: parsed.reviewNote ?? null, reviewedById: reviewer.id, reviewedAt: new Date() },
      });
      if (updated.count !== 1) throw new ResidentDocumentError("REVIEW_NOT_ALLOWED");
      await recordAuditEvent(tx, {
        organizationId: resident.organizationId,
        propertyId: document.propertyId,
        actorUserPublicId: actor.userId,
        actorName: actor.userName,
        actionCode: `KYC_DOCUMENT_${parsed.status}`,
        entityType: "RESIDENT_DOCUMENT",
        entityPublicId: document.publicId,
        summary: `Staff ${parsed.status.toLowerCase()} a resident ${document.documentType.toLowerCase().replaceAll("_", " ")} document.`,
      });
      const memberships = await tx.organizationMembership.findMany({
        where: { organizationId: resident.organizationId, residentId: resident.id, status: "ACTIVE", roles: { some: { roleCode: "RESIDENT" } }, user: { status: "ACTIVE" } },
        select: { userId: true },
      });
      await createNotifications(tx, memberships.map(({ userId }) => ({
        organizationId: resident.organizationId,
        propertyId: document.propertyId,
        userId,
        dedupeKey: `kyc-review:${document.publicId}:${parsed.status}`,
        notificationType: "KYC_DOCUMENT_REVIEWED",
        title: parsed.status === "VERIFIED" ? "Document verified" : "Document needs an update",
        message: parsed.status === "VERIFIED" ? "Your resident document has been verified." : "A resident document was not accepted. Review the note and upload a replacement.",
        actionUrl: `/org/${actor.organizationId}/resident#documents-heading`,
      })));
    });
  },

  async downloadForResident(actor: OrganizationActor, documentPublicId: string, inline = false) {
    const scope = await findSelfResident(actor);
    const document = await prisma.residentDocument.findFirst({
      where: { publicId: documentPublicId, organizationId: scope.organization.id, residentId: scope.resident.id },
      select: { objectKey: true, originalName: true, contentType: true },
    });
    if (!document) throw new ResidentDocumentError("DOCUMENT_NOT_FOUND");
    return getResidentDocumentDownloadUrl(document, inline);
  },

  async downloadForStaff(actor: OrganizationActor, residentPublicId: string, documentPublicId: string, inline = false) {
    const resident = await findStaffResident(actor, residentPublicId);
    const document = await prisma.residentDocument.findFirst({
      where: { publicId: documentPublicId, organizationId: resident.organizationId, residentId: resident.id, ...(managerPropertyFilter(actor) ? { property: { publicId: { in: managerPropertyFilter(actor) } } } : {}) },
      select: { publicId: true, documentType: true, propertyId: true, objectKey: true, originalName: true, contentType: true },
    });
    if (!document) throw new ResidentDocumentError("DOCUMENT_NOT_FOUND");
    await prisma.$transaction((tx) => recordAuditEvent(tx, {
      organizationId: resident.organizationId,
      propertyId: document.propertyId,
      actorUserPublicId: actor.userId,
      actorName: actor.userName,
      actionCode: inline ? "KYC_DOCUMENT_PREVIEWED" : "KYC_DOCUMENT_DOWNLOADED",
      entityType: "RESIDENT_DOCUMENT",
      entityPublicId: document.publicId,
      summary: `Staff accessed a resident ${document.documentType.toLowerCase().replaceAll("_", " ")} document.`,
    }));
    return getResidentDocumentDownloadUrl(document, inline);
  },
};
