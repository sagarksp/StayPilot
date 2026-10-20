import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { notificationUseCases } from "@/modules/notification/application/use-cases";

export async function POST(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/notifications/[notificationId]/read">) {
  const { orgId, notificationId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const updated = await notificationUseCases.markRead(actor, notificationId);
  return Response.json({ data: { read: updated } });
}
