import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { ComplaintWorkflowError, type ComplaintReportRow, type ComplaintSummary } from "../domain/complaint";
import type { ComplaintRepository } from "../application/repository";
import type { complaintReportFilterSchema, CreateComplaintInput, UpdateComplaintInput } from "../application/schemas";
import type { OrganizationActor } from "@/modules/property/domain/inventory";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { createNotifications } from "@/modules/notification/application/use-cases";
import type { z } from "zod";

type ComplaintReportFilters = z.infer<typeof complaintReportFilterSchema>;

const complaintSelect = {
  publicId: true,
  category: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  property: {
    select: {
      publicId: true,
      name: true,
      assignments: {
        where: { status: "ACTIVE", membership: { status: "ACTIVE", roles: { some: { roleCode: "MANAGER" } }, user: { status: "ACTIVE" } } },
        select: { membership: { select: { user: { select: { publicId: true, name: true } } } } },
      },
    },
  },
  residentStay: {
    select: {
      publicId: true,
      resident: { select: { name: true } },
      bed: { select: { label: true, room: { select: { number: true } } } },
    },
  },
  assignedTo: { select: { publicId: true, name: true } },
  events: {
    select: { publicId: true, eventType: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  attachments: {
    select: { publicId: true, originalName: true, contentType: true, byteSize: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ComplaintSelect;

type ComplaintRecord = Prisma.ComplaintGetPayload<{ select: typeof complaintSelect }>;

function toSummary(record: ComplaintRecord): ComplaintSummary {
  const uniqueAssignees = new Map<string, string>();
  for (const assignment of record.property.assignments) uniqueAssignees.set(assignment.membership.user.publicId, assignment.membership.user.name);
  return {
    id: record.publicId,
    stayId: record.residentStay.publicId,
    propertyId: record.property.publicId,
    propertyName: record.property.name,
    residentName: record.residentStay.resident.name,
    roomNumber: record.residentStay.bed.room.number,
    bedLabel: record.residentStay.bed.label,
    category: record.category as ComplaintSummary["category"],
    title: record.title,
    description: record.description,
    status: record.status as ComplaintSummary["status"],
    assignedToId: record.assignedTo?.publicId ?? null,
    assignedToName: record.assignedTo?.name ?? null,
    assignees: [...uniqueAssignees].map(([id, name]) => ({ id, name })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resolvedAt: record.resolvedAt,
    events: record.events.map((event) => ({ id: event.publicId, type: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, note: event.note, actorName: event.actor.name, createdAt: event.createdAt })),
    attachments: record.attachments.map((attachment) => ({ id: attachment.publicId, name: attachment.originalName, contentType: attachment.contentType, byteSize: attachment.byteSize, createdAt: attachment.createdAt })),
  };
}

function toResidentSummary(record: ComplaintRecord): ComplaintSummary {
  return { ...toSummary(record), assignees: [] };
}

function propertyScope(actor: OrganizationActor) {
  return actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds;
}

async function findComplaint(where: Prisma.ComplaintWhereInput) {
  const record = await prisma.complaint.findFirst({ where, select: complaintSelect });
  return record ? toSummary(record) : null;
}

export const prismaComplaintRepository: ComplaintRepository = {
  async listForStaff(actor) {
    const records = await prisma.complaint.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        ...(propertyScope(actor) ? { property: { publicId: { in: [...propertyScope(actor)!] } } } : {}),
      },
      select: complaintSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return records.map(toSummary);
  },

  async getForStaff(actor, complaintId) {
    const scope = propertyScope(actor);
    return findComplaint({ organization: { publicId: actor.organizationId }, publicId: complaintId, ...(scope ? { property: { publicId: { in: [...scope] } } } : {}) });
  },

  async getMetricsForStaff(actor) {
    const scope = propertyScope(actor);
    const where = { organization: { publicId: actor.organizationId }, ...(scope ? { property: { publicId: { in: [...scope] } } } : {}) };
    const [statuses, categories] = await Promise.all([
      prisma.complaint.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["category"], where, _count: { _all: true } }),
    ]);
    return {
      byStatus: statuses.map(({ status, _count }) => ({ status, count: _count._all })),
      byCategory: categories.map(({ category, _count }) => ({ category, count: _count._all })),
    };
  },

  async getReportForStaff(actor, filters: ComplaintReportFilters) {
    const scope = propertyScope(actor);
    const properties = await prisma.property.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        status: { not: "ARCHIVED" },
        ...(scope ? { publicId: { in: [...scope] } } : {}),
      },
      select: { publicId: true, name: true },
      orderBy: { name: "asc" },
    });
    if (filters.propertyId && !properties.some((property) => property.publicId === filters.propertyId)) throw new AccessDeniedError();
    const propertyIds = filters.propertyId ? [filters.propertyId] : scope ? [...scope] : undefined;

    const toExclusive = filters.to ? new Date(`${filters.to}T00:00:00.000Z`) : undefined;
    if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const records = await prisma.complaint.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        ...(propertyIds ? { property: { publicId: { in: propertyIds } } } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || toExclusive ? { createdAt: { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}), ...(toExclusive ? { lt: toExclusive } : {}) } } : {}),
      },
      select: {
        publicId: true,
        category: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        property: { select: { name: true } },
        residentStay: { select: { resident: { select: { name: true } }, bed: { select: { label: true, room: { select: { number: true } } } } } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const rows: ComplaintReportRow[] = records.map((record) => ({
      id: record.publicId,
      category: record.category as ComplaintReportRow["category"],
      title: record.title,
      description: record.description,
      status: record.status as ComplaintReportRow["status"],
      propertyName: record.property.name,
      residentName: record.residentStay.resident.name,
      roomNumber: record.residentStay.bed.room.number,
      bedLabel: record.residentStay.bed.label,
      assignedToName: record.assignedTo?.name ?? null,
      createdAt: record.createdAt,
      resolvedAt: record.resolvedAt,
    }));
    return { properties, rows };
  },

  async listForResident(organizationId, residentEmail) {
    const matches = await prisma.resident.findMany({ where: { organization: { publicId: organizationId }, email: residentEmail }, select: { id: true }, take: 2 });
    if (matches.length !== 1) return [];
    const records = await prisma.complaint.findMany({
      where: { organization: { publicId: organizationId }, residentStay: { residentId: matches[0].id } },
      select: complaintSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return records.map(toResidentSummary);
  },

  async getForResident(organizationId, residentEmail, complaintId) {
    const matches = await prisma.resident.findMany({ where: { organization: { publicId: organizationId }, email: residentEmail }, select: { id: true }, take: 2 });
    if (matches.length !== 1) return null;
    const record = await prisma.complaint.findFirst({ where: { organization: { publicId: organizationId }, publicId: complaintId, residentStay: { residentId: matches[0].id } }, select: complaintSelect });
    return record ? toResidentSummary(record) : null;
  },

  async createForResident(organizationId, residentEmail, actorId, input: CreateComplaintInput) {
    return prisma.$transaction(async (tx) => {
      const matches = await tx.resident.findMany({ where: { organization: { publicId: organizationId }, email: residentEmail }, select: { id: true }, take: 2 });
      if (matches.length !== 1) throw new ComplaintWorkflowError("STAY_NOT_ACTIVE");
      const [actor, stay] = await Promise.all([
        tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } }),
        tx.residentStay.findFirst({
          where: { organization: { publicId: organizationId }, publicId: input.stayId, residentId: matches[0].id, status: { in: ["ACTIVE", "NOTICE_PERIOD"] } },
          select: { id: true, organizationId: true, propertyId: true },
        }),
      ]);
      if (!actor || !stay) throw new ComplaintWorkflowError("STAY_NOT_ACTIVE");
      const complaint = await tx.complaint.create({
        data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, category: input.category, title: input.title, description: input.description },
        select: { id: true, publicId: true },
      });
      await tx.complaintEvent.create({ data: { complaintId: complaint.id, actorId: actor.id, eventType: "CREATED", toStatus: "OPEN", note: "Complaint submitted" } });
      const recipients = await tx.organizationMembership.findMany({
        where: {
          organizationId: stay.organizationId,
          status: "ACTIVE",
          user: { status: "ACTIVE" },
          OR: [
            { roles: { some: { roleCode: "OWNER" } } },
            { roles: { some: { roleCode: "MANAGER" } }, pgAssignments: { some: { propertyId: stay.propertyId, status: "ACTIVE" } } },
          ],
        },
        select: { userId: true },
      });
      const recipientIds = [...new Set(recipients.map(({ userId }) => userId))];
      await createNotifications(tx, recipientIds.map((userId) => ({
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        userId,
        dedupeKey: `complaint-created:${complaint.publicId}`,
        notificationType: "COMPLAINT_CREATED",
        title: "New resident complaint",
        message: `A resident submitted: ${input.title}.`,
        actionUrl: `/org/${organizationId}/complaints`,
      })));
      return complaint.publicId;
    });
  },

  async updateForStaff(actor: OrganizationActor, input: UpdateComplaintInput) {
    await prisma.$transaction(async (tx) => {
      const scope = propertyScope(actor);
      const complaint = await tx.complaint.findFirst({
        where: { organization: { publicId: actor.organizationId }, publicId: input.complaintId, ...(scope ? { property: { publicId: { in: [...scope] } } } : {}) },
        select: { id: true, organizationId: true, propertyId: true, status: true, category: true, assignedToId: true },
      });
      const actorRecord = await tx.user.findUnique({ where: { publicId: actor.userId }, select: { id: true } });
      if (!complaint || !actorRecord) throw new ComplaintWorkflowError("COMPLAINT_NOT_FOUND");

      if (input.status && input.status !== complaint.status) {
        const allowed = (complaint.status === "OPEN" && input.status === "IN_PROGRESS")
          || (complaint.status === "IN_PROGRESS" && input.status === "RESOLVED")
          || (complaint.status === "RESOLVED" && input.status === "CLOSED");
        if (!allowed) throw new ComplaintWorkflowError("INVALID_STATUS_TRANSITION");
        if (input.status === "RESOLVED" && !input.resolutionNote) throw new ComplaintWorkflowError("RESOLUTION_NOTE_REQUIRED");
      }

      let assignedToId = complaint.assignedToId;
      let assignedName: string | null = null;
      if (input.assignedToId !== undefined) {
        if (input.assignedToId === null) assignedToId = null;
        else {
          const assignment = await tx.managerPgAssignment.findFirst({
            where: {
              organizationId: complaint.organizationId,
              propertyId: complaint.propertyId,
              status: "ACTIVE",
              membership: { status: "ACTIVE", roles: { some: { roleCode: "MANAGER" } }, user: { publicId: input.assignedToId, status: "ACTIVE" } },
            },
            select: { membership: { select: { user: { select: { id: true, name: true } } } } },
          });
          if (!assignment) throw new ComplaintWorkflowError("ASSIGNEE_NOT_ALLOWED");
          assignedToId = assignment.membership.user.id;
          assignedName = assignment.membership.user.name;
        }
      }

      const nextStatus = input.status ?? complaint.status;
      const updated = await tx.complaint.updateMany({
        where: { id: complaint.id, status: complaint.status, assignedToId: complaint.assignedToId, category: complaint.category },
        data: {
          ...(input.status ? { status: nextStatus, resolvedAt: nextStatus === "RESOLVED" ? new Date() : complaint.status === "RESOLVED" ? undefined : null } : {}),
          ...(input.assignedToId !== undefined ? { assignedToId } : {}),
          ...(input.category ? { category: input.category } : {}),
        },
      });
      if (updated.count !== 1) throw new ComplaintWorkflowError("INVALID_STATUS_TRANSITION");

      if (input.status && nextStatus !== complaint.status) {
        await tx.complaintEvent.create({ data: { complaintId: complaint.id, actorId: actorRecord.id, eventType: "STATUS", fromStatus: complaint.status, toStatus: nextStatus, note: nextStatus === "RESOLVED" ? input.resolutionNote : null } });
      }
      if (input.assignedToId !== undefined && assignedToId !== complaint.assignedToId) {
        await tx.complaintEvent.create({ data: { complaintId: complaint.id, actorId: actorRecord.id, eventType: "ASSIGNED", note: assignedName ? `Assigned to ${assignedName}` : "Assignment cleared" } });
      }
      if (input.category && input.category !== complaint.category) {
        await tx.complaintEvent.create({ data: { complaintId: complaint.id, actorId: actorRecord.id, eventType: "CATEGORY", note: `Category changed to ${input.category}` } });
      }
    });
  },
};
