import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { sendEmail } from "@/infrastructure/email/smtp";
import {
  ResidentInvitationError,
  createResidentInvitationUseCases,
  type ResidentInvitationRepository,
} from "@/modules/auth/application/resident-invitations";

const repository: ResidentInvitationRepository = {
  async issue({ organizationId, residentId, actorId, propertyIds, tokenHash, expiresAt }) {
    return prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findFirst({
        where: {
          publicId: residentId,
          organization: { publicId: organizationId, status: "ACTIVE" },
          stays: {
            some: propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {},
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          organizationId: true,
          organization: { select: { name: true } },
          stays: {
            where: propertyIds ? { property: { publicId: { in: [...propertyIds] } } } : {},
            orderBy: { startDate: "desc" },
            take: 1,
            select: { property: { select: { name: true } } },
          },
        },
      });
      if (!resident || !resident.stays[0]) {
        throw new ResidentInvitationError("RESIDENT_UNAVAILABLE");
      }
      if (!resident.email) throw new ResidentInvitationError("RESIDENT_EMAIL_REQUIRED");

      await tx.$queryRaw`SELECT id FROM residents WHERE id = ${resident.id} FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } });
      if (!actor) throw new ResidentInvitationError("STAFF_REQUIRED");

      const activeMembership = await tx.organizationMembership.findFirst({
        where: {
          organizationId: resident.organizationId,
          status: "ACTIVE",
          OR: [
            { residentId: resident.id },
            { user: { email: resident.email.toLowerCase(), status: "ACTIVE" }, roles: { some: { roleCode: "RESIDENT" } } },
          ],
        },
        select: { id: true },
      });
      if (activeMembership) throw new ResidentInvitationError("INVITATION_ALREADY_ACCEPTED");

      const existingUser = await tx.user.findUnique({ where: { email: resident.email.toLowerCase() }, select: { status: true } });
      if (existingUser && existingUser.status !== "ACTIVE" && existingUser.status !== "INVITED") {
        throw new ResidentInvitationError("ACCOUNT_UNAVAILABLE");
      }

      const pending = await tx.userInvitation.findFirst({
        where: { organizationId: resident.organizationId, residentId: resident.id, roleCode: "RESIDENT", acceptedAt: null },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      if (pending) {
        const updated = await tx.userInvitation.updateMany({
          where: { id: pending.id, acceptedAt: null },
          data: { tokenHash, expiresAt, email: resident.email.toLowerCase(), createdById: actor.id },
        });
        if (updated.count !== 1) throw new ResidentInvitationError("RESIDENT_UNAVAILABLE");
      } else {
        await tx.userInvitation.create({
          data: {
            organizationId: resident.organizationId,
            residentId: resident.id,
            email: resident.email.toLowerCase(),
            roleCode: "RESIDENT",
            tokenHash,
            expiresAt,
            createdById: actor.id,
          },
        });
      }

      return {
        email: resident.email.toLowerCase(),
        residentName: resident.name,
        organizationName: resident.organization.name,
        propertyName: resident.stays[0].property.name,
      };
    });
  },
};

async function sendResidentInvitationEmail(input: Readonly<{
  email: string;
  residentName: string;
  organizationName: string;
  propertyName: string;
  invitationUrl: string;
}>) {
  return sendEmail({
    to: input.email,
    subject: `Activate your resident account at ${input.organizationName}`,
    text: `Hello ${input.residentName},\n\nYour stay at ${input.propertyName} is ready in StayPilot. Create your account or sign in to view your stay, invoices, deposit activity, and support requests.\n\nAccept your invitation within 7 days: ${input.invitationUrl}\n\nIf you were not expecting this message, contact ${input.organizationName}.`,
  });
}

export const residentInvitationUseCases = createResidentInvitationUseCases(
  repository,
  sendResidentInvitationEmail,
  process.env.APP_URL ?? "http://127.0.0.1:3000",
);
