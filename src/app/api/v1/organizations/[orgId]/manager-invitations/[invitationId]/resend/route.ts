import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { ManagerInvitationError } from "@/modules/auth/application/manager-invitations";

export async function POST(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/manager-invitations/[invitationId]/resend">) {
  const { orgId, invitationId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    return Response.json({ data: await managerInvitationUseCases.resend(actor, invitationId) });
  } catch (error) {
    if (error instanceof ManagerInvitationError) {
      return Response.json({ error: error.code }, { status: error.code === "OWNER_REQUIRED" ? 403 : 404 });
    }
    return Response.json({ error: "INVITATION_RESEND_FAILED" }, { status: 500 });
  }
}
