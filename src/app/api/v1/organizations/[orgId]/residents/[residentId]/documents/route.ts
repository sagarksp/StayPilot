import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentDocumentUseCases } from "@/modules/resident-document/application";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/residents/[residentId]/documents">) {
  const { orgId, residentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    return Response.json({ data: await residentDocumentUseCases.listForStaff(actor, residentId) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
