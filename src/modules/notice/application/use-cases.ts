import { prisma } from "@/infrastructure/db/prisma";
import { createNotifications } from "@/modules/notification/application/use-cases";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { archiveNoticeSchema, publishNoticeSchema, type PublishNoticeInput } from "./schemas";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}

function propertyScope(actor: OrganizationActor) {
  return actor.roles.includes("OWNER") ? {} : { publicId: { in: [...actor.allowedPgIds] } };
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export const noticeUseCases = {
  async getStaffPage(actor: OrganizationActor) {
    assertStaff(actor);
    const whereProperties = { organization: { publicId: actor.organizationId }, status: "ACTIVE", ...propertyScope(actor) };
    const properties = await prisma.property.findMany({ where: whereProperties, select: { publicId: true, name: true }, orderBy: { name: "asc" } });
    const notices = await prisma.notice.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        OR: [
          { propertyId: null },
          { property: { publicId: { in: properties.map((property) => property.publicId) } } },
        ],
      },
      select: { publicId: true, title: true, body: true, publishedAt: true, expiresOn: true, archivedAt: true, property: { select: { publicId: true, name: true } } },
      orderBy: [{ archivedAt: "asc" }, { publishedAt: "desc" }],
      take: 100,
    });
    return { properties, notices };
  },

  async publish(actor: OrganizationActor, input: PublishNoticeInput) {
    assertStaff(actor);
    const parsed = publishNoticeSchema.parse(input);
    if (parsed.expiresOn && parsed.expiresOn < todayInTimezone(actor.organizationTimezone)) throw new Error("NOTICE_EXPIRY_IN_PAST");
    if (!parsed.propertyId && !actor.roles.includes("OWNER")) throw new AccessDeniedError();
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    let propertyId: bigint | null = null;
    if (parsed.propertyId) {
      const propertyAccess = actor.roles.includes("OWNER")
        ? { publicId: parsed.propertyId }
        : { AND: [{ publicId: parsed.propertyId }, propertyScope(actor)] };
      const property = await prisma.property.findFirst({
        where: { ...propertyAccess, organizationId: organization.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!property) throw new AccessDeniedError();
      propertyId = property.id;
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    return prisma.$transaction(async (tx) => {
      const notice = await tx.notice.create({
        data: {
          organizationId: organization.id,
          propertyId,
          title: parsed.title,
          body: parsed.body,
          expiresOn: parsed.expiresOn ? new Date(`${parsed.expiresOn}T00:00:00.000Z`) : null,
          createdById: user.id,
        },
        select: { publicId: true },
      });
      const today = new Date(`${todayInTimezone(actor.organizationTimezone)}T00:00:00.000Z`);
      const stays = await tx.residentStay.findMany({
        where: {
          organizationId: organization.id,
          status: { in: ["ACTIVE", "NOTICE_PERIOD"] },
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
          ...(propertyId ? { propertyId } : {}),
        },
        select: { residentId: true },
      });
      const residentIds = [...new Set(stays.map(({ residentId }) => residentId))];
      if (residentIds.length) {
        const recipients = await tx.organizationMembership.findMany({
          where: {
            organizationId: organization.id,
            status: "ACTIVE",
            residentId: { in: residentIds },
            roles: { some: { roleCode: "RESIDENT" } },
            user: { status: "ACTIVE" },
          },
          select: { userId: true },
        });
        await createNotifications(tx, recipients.map(({ userId }) => ({
          organizationId: organization.id,
          propertyId,
          userId,
          dedupeKey: `notice-published:${notice.publicId}`,
          notificationType: "NOTICE_PUBLISHED",
          title: "New notice published",
          message: parsed.title,
          actionUrl: `/org/${actor.organizationId}/resident#notices-heading`,
        })));
      }
      return notice;
    });
  },

  async archive(actor: OrganizationActor, noticeId: string) {
    assertStaff(actor);
    const parsed = archiveNoticeSchema.parse({ noticeId });
    const notice = await prisma.notice.findFirst({
      where: {
        publicId: parsed.noticeId,
        organization: { publicId: actor.organizationId },
        ...(actor.roles.includes("OWNER") ? {} : { property: { publicId: { in: [...actor.allowedPgIds] } } }),
        archivedAt: null,
      },
      select: { id: true, publicId: true, organizationId: true, propertyId: true },
    });
    if (!notice) throw new AccessDeniedError();
    await prisma.$transaction(async (tx) => {
      const archived = await tx.notice.updateMany({ where: { id: notice.id, archivedAt: null }, data: { archivedAt: new Date() } });
      if (!archived.count) return;
      const today = new Date(`${todayInTimezone(actor.organizationTimezone)}T00:00:00.000Z`);
      const stays = await tx.residentStay.findMany({
        where: {
          organizationId: notice.organizationId,
          status: { in: ["ACTIVE", "NOTICE_PERIOD"] },
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
          ...(notice.propertyId ? { propertyId: notice.propertyId } : {}),
        },
        select: { residentId: true },
      });
      const residentIds = [...new Set(stays.map(({ residentId }) => residentId))];
      if (!residentIds.length) return;
      const recipients = await tx.organizationMembership.findMany({
        where: {
          organizationId: notice.organizationId,
          status: "ACTIVE",
          residentId: { in: residentIds },
          roles: { some: { roleCode: "RESIDENT" } },
          user: { status: "ACTIVE" },
        },
        select: { userId: true },
      });
      await createNotifications(tx, recipients.map(({ userId }) => ({
        organizationId: notice.organizationId,
        propertyId: notice.propertyId,
        userId,
        dedupeKey: `notice-withdrawn:${notice.publicId}`,
        notificationType: "NOTICE_WITHDRAWN",
        title: "Notice withdrawn",
        message: "A notice for your residence has been withdrawn.",
        actionUrl: `/org/${actor.organizationId}/resident#notices-heading`,
      })));
    });
  },

  async listForResident(actor: OrganizationActor) {
    if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
    const membership = await prisma.organizationMembership.findFirst({
      where: { organization: { publicId: actor.organizationId }, user: { publicId: actor.userId }, status: "ACTIVE", residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } },
      select: { residentId: true },
    });
    if (!membership?.residentId) return [];
    const todayString = todayInTimezone(actor.organizationTimezone);
    const today = new Date(`${todayString}T00:00:00.000Z`);
    const stay = await prisma.residentStay.findFirst({
      where: {
        organization: { publicId: actor.organizationId },
        residentId: membership.residentId,
        status: { in: ["ACTIVE", "NOTICE_PERIOD"] },
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      select: { propertyId: true },
      orderBy: { startDate: "desc" },
    });
    if (!stay) return [];
    return prisma.notice.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        archivedAt: null,
        publishedAt: { lte: new Date() },
        OR: [{ propertyId: null }, { propertyId: stay.propertyId }],
        AND: [{ OR: [{ expiresOn: null }, { expiresOn: { gte: today } }] }],
      },
      select: { publicId: true, title: true, body: true, publishedAt: true, expiresOn: true, property: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
  },
};
