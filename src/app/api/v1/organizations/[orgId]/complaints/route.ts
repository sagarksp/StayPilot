import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";

export async function GET(_request: Request, { params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const data = await complaintUseCases.listForStaff(actor);
    return Response.json({ data });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
