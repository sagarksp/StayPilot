import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { ManagerInvitationError } from "@/modules/auth/application/manager-invitations";

export async function POST(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/manager-invitations">) {
  const { orgId } = await params;
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
    return Response.json({ data: await managerInvitationUseCases.create(actor, body) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INVITATION", details: error.issues.map(({ path, message }) => ({ path, message })) }, { status: 400 });
    if (error instanceof ManagerInvitationError) {
      const status = error.code === "OWNER_REQUIRED" ? 403 : error.code === "INVITATION_PENDING" || error.code === "MEMBERSHIP_EXISTS" ? 409 : error.code === "PROPERTY_NOT_IN_ORGANIZATION" ? 400 : 422;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "INVITATION_FAILED" }, { status: 500 });
  }
}
