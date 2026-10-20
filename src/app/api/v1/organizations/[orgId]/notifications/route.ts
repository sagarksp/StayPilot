import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { notificationUseCases } from "@/modules/notification/application/use-cases";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/notifications">) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return Response.json({ data: await notificationUseCases.list(actor) });
}
