import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import type { OrganizationActor } from "@/modules/property/domain/inventory";

type NotificationDraft = Readonly<{
  organizationId: bigint;
  userId: bigint;
  propertyId?: bigint | null;
  dedupeKey: string;
  notificationType: string;
  title: string;
  message: string;
  actionUrl: string;
}>;

export async function createNotifications(
  tx: Pick<typeof prisma, "notification">,
  notifications: readonly NotificationDraft[],
) {
  if (!notifications.length) return 0;
  const created = await tx.notification.createMany({
    data: notifications.map((notification) => ({
      ...notification,
      propertyId: notification.propertyId ?? null,
    })),
    skipDuplicates: true,
  });
  return created.count;
}

export const notificationUseCases = {
  async list(actor: OrganizationActor) {
    const records = await prisma.notification.findMany({
      where: {
        organization: { publicId: actor.organizationId },
        user: { publicId: actor.userId },
      },
      select: {
        publicId: true,
        notificationType: true,
        title: true,
        message: true,
        actionUrl: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
    });
    return records.map((record) => ({ ...record, type: record.notificationType }));
  },

  async markRead(actor: OrganizationActor, notificationId: string) {
    const updated = await prisma.notification.updateMany({
      where: {
        publicId: notificationId,
        organization: { publicId: actor.organizationId },
        user: { publicId: actor.userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return updated.count > 0;
  },

  async generateDueReminders() {
    const organizations = await prisma.organization.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, publicId: true, timezone: true },
    });
    let createdCount = 0;
    for (const organization of organizations) {
      const today = dateInTimezone(organization.timezone);
      const dueDateString = addDays(today, 2);
      const dueDate = new Date(`${dueDateString}T00:00:00.000Z`);
      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId: organization.id,
          dueDate,
          status: { in: ["FINALIZED", "PARTIALLY_PAID"] },
        },
        select: {
          publicId: true,
          invoiceNumber: true,
          propertyId: true,
          totalPaise: true,
          adjustmentPaise: true,
          amountPaidPaise: true,
          residentStay: { select: { residentId: true } },
        },
      });
      if (!invoices.length) continue;
      const residentIds = [...new Set(invoices.map(({ residentStay }) => residentStay.residentId))];
      const memberships = await prisma.organizationMembership.findMany({
        where: {
          organizationId: organization.id,
          status: "ACTIVE",
          residentId: { in: residentIds },
          roles: { some: { roleCode: "RESIDENT" } },
          user: { status: "ACTIVE" },
        },
        select: { residentId: true, userId: true },
      });
      const usersByResident = new Map<bigint, bigint>();
      for (const membership of memberships) {
        if (membership.residentId) usersByResident.set(membership.residentId, membership.userId);
      }
      const notifications: NotificationDraft[] = [];
      for (const invoice of invoices) {
        if (invoice.totalPaise + invoice.adjustmentPaise <= invoice.amountPaidPaise) continue;
        const userId = usersByResident.get(invoice.residentStay.residentId);
        if (!userId) continue;
        notifications.push({
          organizationId: organization.id,
          userId,
          propertyId: invoice.propertyId,
          dedupeKey: `invoice-due:${invoice.publicId}:${dueDateString}`,
          notificationType: "INVOICE_DUE",
          title: "Invoice due in two days",
          message: `Invoice ${invoice.invoiceNumber} is due on ${dueDateString}. Please review your bill.`,
          actionUrl: `/org/${organization.publicId}/resident#invoices-heading`,
        });
      }
      createdCount += await createNotifications(prisma, notifications);
    }
    return createdCount;
  },
};

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
