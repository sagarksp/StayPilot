import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { voteSchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ pollId: string }> }>;

export async function PUT(request: Request, { params }: Context) {
  const { pollId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_BODY" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("orgId" in body) || typeof body.orgId !== "string") return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(body.orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = voteSchema.safeParse({ pollId, optionId: "optionId" in body ? body.optionId : undefined, suggestion: "suggestion" in body ? body.suggestion : undefined });
  if (!parsed.success) return Response.json({ error: "INVALID_VOTE", issues: parsed.error.issues }, { status: 400 });
  try {
    await foodUseCases.vote(actor, parsed.data);
    return Response.json({ data: { pollId, status: "VOTED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_SUGGESTION_REQUIRED") return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && ["POLL_CLOSED", "INVALID_POLL_OPTION", "RESIDENT_AWAY"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
