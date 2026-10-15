import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { createPollSchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string; pgId: string }> }>;

export async function GET(_request: Request, { params }: Context) {
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    return Response.json({ data: await foodUseCases.listManagerPolls(actor, pgId) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}

export async function POST(request: Request, { params }: Context) {
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_BODY" }, { status: 400 }); }
  const candidate = body && typeof body === "object" ? { ...body, propertyId: pgId } : body;
  const parsed = createPollSchema.safeParse(candidate);
  if (!parsed.success) return Response.json({ error: "INVALID_FOOD_POLL", issues: parsed.error.issues }, { status: 400 });
  try {
    const poll = await foodUseCases.createPoll(actor, parsed.data);
    return Response.json({ data: { id: poll.publicId, status: poll.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && ["INVALID_POLL_TIME", "INVALID_MEAL_TYPE", "FOOD_POLL_ALREADY_EXISTS"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
