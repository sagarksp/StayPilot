import "server-only";
import { prisma } from "@/infrastructure/db/prisma";

export async function createDemoRequest(input: {
  name: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  address: string;
}) {
  const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.demoRequest.count({ where: { email: input.email, createdAt: { gte: recentSince } } });
  if (recentCount >= 3) return false;
  await prisma.demoRequest.create({ data: input });
  return true;
}

export async function listDemoRequests() {
  return prisma.demoRequest.findMany({
    select: {
      publicId: true,
      name: true,
      email: true,
      phoneCountryCode: true,
      phoneNumber: true,
      address: true,
      status: true,
      createdAt: true,
      reviewedByEmail: true,
      reviewedAt: true,
      invitation: { select: { demoDurationHours: true, expiresAt: true, acceptedAt: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 150,
  });
}

export async function claimDemoRequest(publicId: string, reviewedByEmail: string) {
  const request = await prisma.demoRequest.findFirst({ where: { publicId, status: "PENDING" } });
  if (!request) return null;
  const claimed = await prisma.demoRequest.updateMany({
    where: { id: request.id, status: "PENDING" },
    data: { status: "PROCESSING", reviewedByEmail, reviewedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  return request;
}

export async function attachDemoInvitation(requestId: bigint, invitationPublicId: string) {
  const invitation = await prisma.platformOwnerInvitation.findUnique({ where: { publicId: invitationPublicId }, select: { id: true } });
  if (!invitation) throw new Error("DEMO_INVITATION_NOT_FOUND");
  await prisma.demoRequest.update({ where: { id: requestId }, data: { status: "INVITED", invitationId: invitation.id } });
}

export async function closeDemoRequest(publicId: string, reviewedByEmail: string) {
  const result = await prisma.demoRequest.updateMany({
    where: { publicId, status: "PENDING" },
    data: { status: "CLOSED", reviewedByEmail, reviewedAt: new Date() },
  });
  return result.count === 1;
}

export async function releaseDemoRequest(requestId: bigint) {
  await prisma.demoRequest.updateMany({
    where: { id: requestId, status: "PROCESSING" },
    data: { status: "PENDING", reviewedByEmail: null, reviewedAt: null },
  });
}
