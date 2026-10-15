import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string; pgId: string; pollId: string }> }>;

export async function POST(_request: Request, { params }: Context) {
  const { orgId, pgId, pollId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const polls = await foodUseCases.listManagerPolls(actor, pgId);
    if (!polls.some((poll) => poll.publicId === pollId)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    await foodUseCases.closePoll(actor, pollId);
    return Response.json({ data: { id: pollId, status: "CLOSED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_POLL_NOT_OPEN") return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
