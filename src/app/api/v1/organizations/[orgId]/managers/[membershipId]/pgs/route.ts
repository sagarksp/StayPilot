import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { ManagerInvitationError } from "@/modules/auth/application/manager-invitations";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/managers/[membershipId]/pgs">) {
  const { orgId, membershipId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const propertyIds = await managerInvitationUseCases.getManagerProperties(actor, membershipId);
  if (!propertyIds) return Response.json({ error: "MANAGER_NOT_FOUND" }, { status: 404 });
  return Response.json({ data: { propertyIds } });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/managers/[membershipId]/pgs">) {
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
    const propertyIds = await managerInvitationUseCases.replaceManagerProperties(actor, membershipId, body);
    return Response.json({ data: { propertyIds } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_PROPERTY_SCOPE" }, { status: 400 });
    if (error instanceof ManagerInvitationError) {
      const status = error.code === "OWNER_REQUIRED" ? 403 : error.code === "PROPERTY_NOT_IN_ORGANIZATION" ? 400 : 404;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "MANAGER_SCOPE_UPDATE_FAILED" }, { status: 500 });
  }
}
