import "server-only";
import { ManagerInvitationError, createManagerInvitationUseCases, type ManagerInvitationRepository } from "@/modules/auth/application/manager-invitations";
import { prisma } from "@/infrastructure/db/prisma";
import { sendEmail } from "@/infrastructure/email/smtp";

const repository: ManagerInvitationRepository = {
  async getTeam(organizationId, now) {
    const [memberships, invitations] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { organization: { publicId: organizationId }, roles: { some: { roleCode: { in: ["OWNER", "MANAGER"] } } } },
        select: {
          publicId: true,
          status: true,
          user: { select: { publicId: true, name: true, email: true } },
          roles: { where: { roleCode: { in: ["OWNER", "MANAGER"] } }, select: { roleCode: true } },
          pgAssignments: { where: { status: "ACTIVE", property: { status: "ACTIVE" } }, select: { property: { select: { publicId: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userInvitation.findMany({
        where: { organization: { publicId: organizationId }, roleCode: "MANAGER", acceptedAt: null },
        select: { publicId: true, email: true, expiresAt: true, properties: { select: { property: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return {
      members: memberships.map((membership) => ({
        id: membership.publicId,
        name: membership.user.name,
        email: membership.user.email,
        roleCode: membership.roles.some(({ roleCode }) => roleCode === "OWNER") ? "OWNER" as const : "MANAGER" as const,
        status: membership.status === "ACTIVE" ? "ACTIVE" as const : "INACTIVE" as const,
        propertyIds: membership.pgAssignments.map(({ property }) => property.publicId),
        propertyNames: membership.pgAssignments.map(({ property }) => property.name),
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.publicId,
        email: invitation.email,
        propertyNames: invitation.properties.map(({ property }) => property.name),
        expiresAt: invitation.expiresAt,
        status: invitation.expiresAt > now ? "PENDING" as const : "EXPIRED" as const,
      })),
    };
  },

  async updateMembershipStatus(organizationId, membershipId, status) {
    return prisma.$transaction(async (tx) => {
      const organizations = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM organizations WHERE public_id = ${organizationId} AND status = 'ACTIVE' FOR UPDATE`;
      if (!organizations.length) return null;
      const organizationIdNumber = organizations[0].id;
      const membership = await tx.organizationMembership.findFirst({
        where: { organizationId: organizationIdNumber, publicId: membershipId, roles: { some: { roleCode: { in: ["OWNER", "MANAGER"] } } } },
        select: { id: true, status: true, roles: { select: { roleCode: true } } },
      });
      if (!membership) return null;

      const isOwner = membership.roles.some(({ roleCode }) => roleCode === "OWNER");
      if (status === "INACTIVE" && membership.status === "ACTIVE" && isOwner) {
        const activeOwners = await tx.organizationMembership.count({
          where: { organizationId: organizationIdNumber, status: "ACTIVE", roles: { some: { roleCode: "OWNER" } } },
        });
        if (activeOwners <= 1) throw new ManagerInvitationError("LAST_ACTIVE_OWNER");
      }

      await tx.organizationMembership.update({ where: { id: membership.id }, data: { status } });
      return status;
    });
  },

  async getManagerProperties(organizationId, membershipId) {
    const membership = await prisma.organizationMembership.findFirst({
      where: { organization: { publicId: organizationId, status: "ACTIVE" }, publicId: membershipId, status: "ACTIVE", roles: { some: { roleCode: "MANAGER" } } },
      select: { pgAssignments: { where: { status: "ACTIVE", property: { status: "ACTIVE" } }, select: { property: { select: { publicId: true } } } } },
    });
    return membership ? membership.pgAssignments.map(({ property }) => property.publicId) : null;
  },

  async replaceManagerProperties({ organizationId, membershipId, propertyIds }) {
    return prisma.$transaction(async (tx) => {
      const membership = await tx.organizationMembership.findFirst({
        where: { organization: { publicId: organizationId, status: "ACTIVE" }, publicId: membershipId, status: "ACTIVE", roles: { some: { roleCode: "MANAGER" } } },
        select: { id: true, organizationId: true },
      });
      if (!membership) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      const properties = propertyIds.length
        ? await tx.property.findMany({ where: { organizationId: membership.organizationId, publicId: { in: propertyIds }, status: "ACTIVE" }, select: { id: true, publicId: true } })
        : [];
      if (properties.length !== propertyIds.length) throw new ManagerInvitationError("PROPERTY_NOT_IN_ORGANIZATION");

      await tx.managerPgAssignment.updateMany({
        where: { organizationId: membership.organizationId, membershipId: membership.id, status: "ACTIVE", ...(properties.length ? { propertyId: { notIn: properties.map(({ id }) => id) } } : {}) },
        data: { status: "INACTIVE" },
      });
      for (const property of properties) {
        await tx.managerPgAssignment.upsert({
          where: { membershipId_propertyId: { membershipId: membership.id, propertyId: property.id } },
          create: { organizationId: membership.organizationId, membershipId: membership.id, propertyId: property.id, status: "ACTIVE" },
          update: { status: "ACTIVE" },
        });
      }
      return properties.map(({ publicId }) => publicId);
    });
  },

  async create({ organizationId, actorId, email, propertyIds, tokenHash, expiresAt, now }) {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findFirst({ where: { publicId: organizationId, status: "ACTIVE" }, select: { id: true, publicId: true, name: true } });
      const actor = await tx.user.findUnique({ where: { publicId: actorId }, select: { id: true } });
      if (!organization || !actor) throw new ManagerInvitationError("OWNER_REQUIRED");

      const propertyRecords = propertyIds.length
        ? await tx.property.findMany({ where: { organizationId: organization.id, publicId: { in: propertyIds }, status: "ACTIVE" }, select: { id: true, publicId: true, name: true } })
        : [];
      if (propertyRecords.length !== propertyIds.length) throw new ManagerInvitationError("PROPERTY_NOT_IN_ORGANIZATION");

      const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true, status: true } });
      if (existingUser && existingUser.status !== "ACTIVE" && existingUser.status !== "INVITED") throw new ManagerInvitationError("ACCOUNT_UNAVAILABLE");
      if (existingUser && await tx.organizationMembership.findFirst({ where: { organizationId: organization.id, userId: existingUser.id }, select: { id: true } })) {
        throw new ManagerInvitationError("MEMBERSHIP_EXISTS");
      }
      if (await tx.userInvitation.findFirst({ where: { organizationId: organization.id, email, roleCode: "MANAGER", acceptedAt: null, expiresAt: { gt: now } }, select: { id: true } })) {
        throw new ManagerInvitationError("INVITATION_PENDING");
      }

      const invitation = await tx.userInvitation.create({
        data: {
          organizationId: organization.id,
          email,
          roleCode: "MANAGER",
          tokenHash,
          expiresAt,
          createdById: actor.id,
        },
        select: { id: true, publicId: true },
      });
      if (propertyRecords.length) await tx.userInvitationProperty.createMany({ data: propertyRecords.map((property) => ({ organizationId: organization.id, invitationId: invitation.id, propertyId: property.id })) });
      return { id: invitation.publicId, email, organizationName: organization.name, propertyNames: propertyRecords.map(({ name }) => name), expiresAt };
    });
  },

  async resend({ organizationId, invitationId, tokenHash, expiresAt }) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.userInvitation.findFirst({
        where: { organization: { publicId: organizationId }, publicId: invitationId, roleCode: "MANAGER", acceptedAt: null },
        select: { id: true, organization: { select: { name: true } }, email: true, properties: { select: { property: { select: { name: true } } } } },
      });
      if (!invitation) return null;
      const updated = await tx.userInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null }, data: { tokenHash, expiresAt } });
      if (updated.count !== 1) return null;
      return { email: invitation.email, organizationName: invitation.organization.name, propertyNames: invitation.properties.map(({ property }) => property.name), expiresAt };
    });
  },

  async getInvitation(tokenHash, now) {
    const invitation = await prisma.userInvitation.findFirst({
      where: { tokenHash, roleCode: { in: ["MANAGER", "RESIDENT"] }, acceptedAt: null, expiresAt: { gt: now }, organization: { status: "ACTIVE" } },
      select: { email: true, roleCode: true, resident: { select: { name: true } }, organization: { select: { name: true } }, properties: { select: { property: { select: { name: true } } } } },
    });
    if (!invitation) return null;
    if (invitation.roleCode !== "MANAGER" && invitation.roleCode !== "RESIDENT") return null;
    return {
      email: invitation.email,
      organizationName: invitation.organization.name,
      propertyNames: invitation.properties.map(({ property }) => property.name),
      roleCode: invitation.roleCode,
      residentName: invitation.resident?.name ?? null,
    };
  },

  async accept({ tokenHash, email, name, now }) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.userInvitation.findFirst({
        where: { tokenHash, roleCode: { in: ["MANAGER", "RESIDENT"] }, acceptedAt: null, expiresAt: { gt: now }, organization: { status: "ACTIVE" } },
        select: {
          id: true,
          organizationId: true,
          organization: { select: { publicId: true } },
          email: true,
          roleCode: true,
          residentId: true,
          resident: { select: { email: true } },
          properties: { where: { property: { status: "ACTIVE" } }, select: { propertyId: true } },
        },
      });
      if (!invitation || invitation.email.toLowerCase() !== email) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      if (invitation.roleCode === "RESIDENT" && (!invitation.residentId || invitation.resident?.email?.toLowerCase() !== email)) {
        throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      }

      const claimed = await tx.userInvitation.updateMany({ where: { id: invitation.id, tokenHash, acceptedAt: null, expiresAt: { gt: now } }, data: { acceptedAt: now } });
      if (claimed.count !== 1) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");

      let user = await tx.user.findUnique({ where: { email }, select: { id: true, status: true } });
      if (user && user.status !== "ACTIVE" && user.status !== "INVITED") throw new ManagerInvitationError("ACCOUNT_UNAVAILABLE");
      if (!user) user = await tx.user.create({ data: { email, name: name || email, status: "ACTIVE" }, select: { id: true, status: true } });
      else if (user.status !== "ACTIVE") user = await tx.user.update({ where: { id: user.id }, data: { status: "ACTIVE", name: name || undefined }, select: { id: true, status: true } });

      const membership = await tx.organizationMembership.findFirst({
        where: { organizationId: invitation.organizationId, userId: user.id },
        select: { id: true, status: true, residentId: true, roles: { select: { roleCode: true } } },
      });
      if (invitation.roleCode === "MANAGER") {
        if (membership) throw new ManagerInvitationError("MEMBERSHIP_EXISTS");
        const created = await tx.organizationMembership.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            status: "ACTIVE",
            roles: { create: { roleCode: "MANAGER" } },
            pgAssignments: { create: invitation.properties.map(({ propertyId }) => ({ propertyId, status: "ACTIVE" })) },
          },
          select: { id: true },
        });
        if (!created) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      } else if (membership) {
        if (membership.status !== "ACTIVE" || (membership.residentId !== null && membership.residentId !== invitation.residentId)) {
          throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
        }
        if (membership.residentId === null) {
          await tx.organizationMembership.update({ where: { id: membership.id }, data: { residentId: invitation.residentId! } });
        }
        if (!membership.roles.some(({ roleCode }) => roleCode === "RESIDENT")) {
          await tx.membershipRole.create({ data: { membershipId: membership.id, roleCode: "RESIDENT" } });
        }
      } else {
        await tx.organizationMembership.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            residentId: invitation.residentId,
            status: "ACTIVE",
            roles: { create: { roleCode: "RESIDENT" } },
          },
          select: { id: true },
        });
      }
      return { organizationId: invitation.organization.publicId, roleCode: invitation.roleCode as "MANAGER" | "RESIDENT" };
    });
  },
};

async function sendInvitationEmail(input: Readonly<{ email: string; organizationName: string; propertyNames: string[]; invitationUrl: string }>) {
  const scope = input.propertyNames.length ? `Assigned properties: ${input.propertyNames.join(", ")}.` : "No properties were assigned yet.";
  return sendEmail({
    to: input.email,
    subject: `You're invited to manage ${input.organizationName} on StayPilot`,
    text: `You have been invited to join ${input.organizationName} as a manager on StayPilot. ${scope}\n\nAccept your invitation within 7 days: ${input.invitationUrl}\n\nIf you were not expecting this invitation, you can ignore this message.`,
  });
}

export const managerInvitationUseCases = createManagerInvitationUseCases(
  repository,
  sendInvitationEmail,
  process.env.APP_URL ?? "http://127.0.0.1:3000",
);
