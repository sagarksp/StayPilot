import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    return Response.json({ data: await foodUseCases.listForResident(actor) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
