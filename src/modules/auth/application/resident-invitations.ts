import { createHash, randomBytes } from "node:crypto";
import type { OrganizationActor } from "@/modules/property/domain/inventory";

export class ResidentInvitationError extends Error {
  constructor(readonly code: "STAFF_REQUIRED" | "RESIDENT_UNAVAILABLE" | "RESIDENT_EMAIL_REQUIRED" | "INVITATION_ALREADY_ACCEPTED" | "ACCOUNT_UNAVAILABLE") {
    super(code);
    this.name = "ResidentInvitationError";
  }
}

export interface ResidentInvitationRepository {
  issue(input: Readonly<{
    organizationId: string;
    residentId: string;
    actorId: string;
    propertyIds?: readonly string[];
    tokenHash: string;
    expiresAt: Date;
  }>): Promise<Readonly<{ email: string; residentName: string; organizationName: string; propertyName: string }>>;
}

export type ResidentInvitationEmailSender = (input: Readonly<{
  email: string;
  residentName: string;
  organizationName: string;
  propertyName: string;
  invitationUrl: string;
}>) => Promise<boolean>;

function makeToken() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createResidentInvitationUseCases(
  repository: ResidentInvitationRepository,
  sendEmail: ResidentInvitationEmailSender,
  appUrl: string,
) {
  return {
    async issue(actor: OrganizationActor, residentId: string) {
      if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) {
        throw new ResidentInvitationError("STAFF_REQUIRED");
      }
      const token = makeToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const resident = await repository.issue({
        organizationId: actor.organizationId,
        residentId,
        actorId: actor.userId,
        propertyIds: actor.activePgIds,
        tokenHash: tokenHash(token),
        expiresAt,
      });
      const invitationUrl = `${appUrl.replace(/\/$/, "")}/invite/${token}`;
      let emailSent = false;
      try {
        emailSent = await sendEmail({ ...resident, invitationUrl });
      } catch {
        // Delivery happens after the invitation is persisted and must not undo it.
      }
      return { ...resident, invitationUrl, expiresAt, emailSent };
    },
  };
}
