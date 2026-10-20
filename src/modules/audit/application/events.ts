import type { Prisma } from "@/generated/prisma/client";

export type AuditEvent = Readonly<{
  organizationId: bigint;
  propertyId?: bigint | null;
  actorUserPublicId: string;
  actorName: string;
  actionCode: string;
  entityType: string;
  entityPublicId?: string | null;
  summary: string;
}>;

export function formatAuditMoneyPaise(paise: bigint) {
  const rupees = paise / BigInt(100);
  const remainder = (paise % BigInt(100)).toString().padStart(2, "0");
  return `₹${new Intl.NumberFormat("en-IN").format(rupees)}.${remainder}`;
}

export async function recordAuditEvent(tx: Prisma.TransactionClient, event: AuditEvent) {
  await tx.auditLog.create({
    data: {
      organizationId: event.organizationId,
      propertyId: event.propertyId ?? null,
      actorUserPublicId: event.actorUserPublicId,
      actorName: event.actorName.slice(0, 180),
      actionCode: event.actionCode.slice(0, 80),
      entityType: event.entityType.slice(0, 60),
      entityPublicId: event.entityPublicId ?? null,
      summary: event.summary.slice(0, 500),
    },
  });
}
