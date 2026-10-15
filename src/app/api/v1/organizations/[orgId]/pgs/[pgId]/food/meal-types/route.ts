import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { mealTypesSchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string; pgId: string }> }>;

export async function GET(_request: Request, { params }: Context) {
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    return Response.json({ data: await foodUseCases.listMealTypes(actor, pgId) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_BODY" }, { status: 400 }); }
  const parsed = mealTypesSchema.safeParse({ propertyId: pgId, mealTypes: body && typeof body === "object" && "mealTypes" in body ? body.mealTypes : null });
  if (!parsed.success) return Response.json({ error: "INVALID_MEAL_TYPES", issues: parsed.error.issues }, { status: 400 });
  try {
    await foodUseCases.replaceMealTypes(actor, parsed.data);
    return Response.json({ data: await foodUseCases.listMealTypes(actor, pgId) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "DUPLICATE_MEAL_TYPE") return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
