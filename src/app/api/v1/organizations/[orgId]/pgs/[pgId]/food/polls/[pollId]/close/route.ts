import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function POST(_request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; pgId: string; pollId: string }> }>) {
  const { orgId, pgId, pollId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    await foodUseCases.closePoll(actor, pollId, pgId);
    return Response.json({ data: { pollId, status: "CLOSED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_POLL_NOT_OPEN") return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
