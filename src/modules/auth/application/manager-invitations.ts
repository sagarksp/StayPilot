import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { OrganizationActor } from "@/modules/property/domain/inventory";

export const managerInvitationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  propertyIds: z.array(z.string().uuid()).max(100).default([]).refine((ids) => new Set(ids).size === ids.length),
});
export const managerPropertyScopeSchema = z.object({
  propertyIds: z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length),
});
export const membershipStatusSchema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) });

export type ManagerInvitationInput = z.infer<typeof managerInvitationSchema>;
export type ManagerPropertyScopeInput = z.infer<typeof managerPropertyScopeSchema>;
export type MembershipStatusInput = z.infer<typeof membershipStatusSchema>;

export type ManagerTeam = Readonly<{
  members: ReadonlyArray<Readonly<{ id: string; name: string; email: string; roleCode: "OWNER" | "MANAGER"; status: "ACTIVE" | "INACTIVE"; propertyIds: string[]; propertyNames: string[] }>>;
  invitations: ReadonlyArray<Readonly<{ id: string; email: string; propertyNames: string[]; expiresAt: Date | string; status: "PENDING" | "EXPIRED" }>>;
}>;

export type InvitationDetails = Readonly<{
  email: string;
  organizationName: string;
  propertyNames: string[];
  roleCode: "MANAGER" | "RESIDENT";
  residentName: string | null;
}>;

export type AcceptedInvitation = Readonly<{ organizationId: string; roleCode: "MANAGER" | "RESIDENT" }>;

export class ManagerInvitationError extends Error {
  constructor(readonly code: "OWNER_REQUIRED" | "PROPERTY_NOT_IN_ORGANIZATION" | "MEMBERSHIP_EXISTS" | "INVITATION_PENDING" | "INVITATION_UNAVAILABLE" | "ACCOUNT_UNAVAILABLE" | "MEMBERSHIP_NOT_FOUND" | "LAST_ACTIVE_OWNER") {
    super(code);
    this.name = "ManagerInvitationError";
  }
}

export interface ManagerInvitationRepository {
  getTeam(organizationId: string, now: Date): Promise<ManagerTeam>;
  updateMembershipStatus(organizationId: string, membershipId: string, status: "ACTIVE" | "INACTIVE"): Promise<"ACTIVE" | "INACTIVE" | null>;
  getManagerProperties(organizationId: string, membershipId: string): Promise<string[] | null>;
  replaceManagerProperties(input: Readonly<{ organizationId: string; membershipId: string; propertyIds: string[] }>): Promise<string[]>;
  create(input: Readonly<{ organizationId: string; actorId: string; email: string; propertyIds: string[]; tokenHash: string; expiresAt: Date; now: Date }>): Promise<Readonly<{ id: string; email: string; organizationName: string; propertyNames: string[]; expiresAt: Date }>>;
  resend(input: Readonly<{ organizationId: string; invitationId: string; tokenHash: string; expiresAt: Date; now: Date }>): Promise<Readonly<{ email: string; organizationName: string; propertyNames: string[]; expiresAt: Date }> | null>;
  getInvitation(tokenHash: string, now: Date): Promise<InvitationDetails | null>;
  accept(input: Readonly<{ tokenHash: string; email: string; name: string; now: Date }>): Promise<AcceptedInvitation>;
}

export type InvitationEmailSender = (input: Readonly<{ email: string; organizationName: string; propertyNames: string[]; invitationUrl: string }>) => Promise<boolean>;

function assertOwner(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER")) throw new ManagerInvitationError("OWNER_REQUIRED");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("base64url");
}

function invitationUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export function createManagerInvitationUseCases(repository: ManagerInvitationRepository, sendEmail: InvitationEmailSender, appUrl: string) {
  return {
    async getTeam(actor: OrganizationActor) {
      assertOwner(actor);
      return repository.getTeam(actor.organizationId, new Date());
    },

    async updateMembershipStatus(actor: OrganizationActor, membershipId: string, input: unknown) {
      assertOwner(actor);
      const parsed = membershipStatusSchema.parse(input);
      const status = await repository.updateMembershipStatus(actor.organizationId, membershipId, parsed.status);
      if (!status) throw new ManagerInvitationError("MEMBERSHIP_NOT_FOUND");
      return { status };
    },

    async replaceManagerProperties(actor: OrganizationActor, membershipId: string, input: unknown) {
      assertOwner(actor);
      const parsed = managerPropertyScopeSchema.parse(input);
      return repository.replaceManagerProperties({ organizationId: actor.organizationId, membershipId, propertyIds: parsed.propertyIds });
    },

    async getManagerProperties(actor: OrganizationActor, membershipId: string) {
      assertOwner(actor);
      return repository.getManagerProperties(actor.organizationId, membershipId);
    },

    async create(actor: OrganizationActor, input: unknown) {
      assertOwner(actor);
      const parsed = managerInvitationSchema.parse(input);
      const token = makeToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await repository.create({ organizationId: actor.organizationId, actorId: actor.userId, ...parsed, tokenHash: tokenHash(token), expiresAt, now: new Date() });
      const url = invitationUrl(appUrl, token);
      const emailSent = await sendEmail({ email: created.email, organizationName: created.organizationName, propertyNames: created.propertyNames, invitationUrl: url });
      return { ...created, invitationUrl: url, emailSent };
    },

    async resend(actor: OrganizationActor, invitationId: string) {
      assertOwner(actor);
      const token = makeToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const resent = await repository.resend({ organizationId: actor.organizationId, invitationId, tokenHash: tokenHash(token), expiresAt, now: new Date() });
      if (!resent) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      const url = invitationUrl(appUrl, token);
      const emailSent = await sendEmail({ email: resent.email, organizationName: resent.organizationName, propertyNames: resent.propertyNames, invitationUrl: url });
      return { ...resent, invitationUrl: url, emailSent };
    },

    getInvitation(token: string) {
      if (!token || token.length > 100) return Promise.resolve(null);
      return repository.getInvitation(tokenHash(token), new Date());
    },

    accept(token: string, email: string, name: string) {
      if (!token || token.length > 100) throw new ManagerInvitationError("INVITATION_UNAVAILABLE");
      return repository.accept({ tokenHash: tokenHash(token), email: email.trim().toLowerCase(), name: name.trim().slice(0, 180), now: new Date() });
    },
  };
}
