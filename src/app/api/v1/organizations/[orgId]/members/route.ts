import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/members">) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return Response.json({ data: await managerInvitationUseCases.getTeam(actor) });
}
