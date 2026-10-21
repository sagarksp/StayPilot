import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/infrastructure/email/smtp";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPlatformOwnerInvitation(input: { email: string; ownerName: string; createdByEmail: string; demoDurationHours?: number }) {
  const token = randomBytes(32).toString("base64url");
  const invitation = await prisma.platformOwnerInvitation.create({
    data: {
      email: input.email,
      ownerName: input.ownerName,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByEmail: input.createdByEmail,
      demoDurationHours: input.demoDurationHours ?? null,
    },
    select: { id: true, publicId: true },
  });
  const setupUrl = new URL("/register", process.env.APP_URL ?? "http://127.0.0.1:3000");
  setupUrl.searchParams.set("invite", token);
  const delivered = await sendEmail({
    to: input.email,
    subject: "Your StayPilot owner account is ready to set up",
    text: `Hello ${input.ownerName},\n\nA StayPilot developer has invited you to create an owner account${input.demoDurationHours ? ` with ${input.demoDurationHours} hours of demo access after workspace setup` : ""}. Open this one-time setup link within seven days, create your password, and verify your email:\n\n${setupUrl.href}\n\nStayPilot will never email you a password. If you were not expecting this invitation, ignore this message.`,
  });
  if (!delivered) {
    await prisma.platformOwnerInvitation.delete({ where: { id: invitation.id } });
    throw new Error("EMAIL_DELIVERY_FAILED");
  }
  return invitation.publicId;
}

export async function getPlatformOwnerInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const invitation = await prisma.platformOwnerInvitation.findFirst({
    where: { tokenHash: tokenHash(token), acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { email: true, ownerName: true, expiresAt: true, demoDurationHours: true },
  });
  return invitation;
}

export async function listPlatformOwnerInvitations() {
  return prisma.platformOwnerInvitation.findMany({
    select: { publicId: true, email: true, ownerName: true, expiresAt: true, acceptedAt: true, createdByEmail: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
}

export async function acceptPlatformOwnerInvitation(input: { token: string; email: string }, transaction: Prisma.TransactionClient) {
  const invitation = await transaction.platformOwnerInvitation.findFirst({
    where: { tokenHash: tokenHash(input.token), email: input.email, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, demoDurationHours: true },
  });
  if (!invitation) throw new Error("OWNER_INVITATION_INVALID");
  await transaction.platformOwnerInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  return invitation.demoDurationHours;
}
