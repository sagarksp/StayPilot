import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { ManagerInvitationError } from "@/modules/auth/application/manager-invitations";

export async function PATCH(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/members/[membershipId]">) {
  const { orgId, membershipId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    return Response.json({ data: await managerInvitationUseCases.updateMembershipStatus(actor, membershipId, body) });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_MEMBERSHIP_STATUS" }, { status: 400 });
    if (error instanceof ManagerInvitationError) {
      const status = error.code === "OWNER_REQUIRED" ? 403 : error.code === "MEMBERSHIP_NOT_FOUND" ? 404 : error.code === "LAST_ACTIVE_OWNER" ? 409 : 422;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "MEMBERSHIP_STATUS_UPDATE_FAILED" }, { status: 500 });
  }
}
