import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { updateFoodMenuSchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string; pgId: string; menuId: string }> }>;

export async function PATCH(request: Request, { params }: Context) {
  const { orgId, pgId, menuId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_BODY" }, { status: 400 }); }
  const candidate = body && typeof body === "object" ? { ...body, propertyId: pgId, menuId } : body;
  const parsed = updateFoodMenuSchema.safeParse(candidate);
  if (!parsed.success) return Response.json({ error: "INVALID_FOOD_MENU", issues: parsed.error.issues }, { status: 400 });
  try {
    await foodUseCases.updateMenu(actor, parsed.data);
    return Response.json({ data: { id: menuId, status: "PUBLISHED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_MENU_NOT_FOUND") return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && ["INVALID_MEAL_TYPE", "FOOD_MENU_LOCKED", "MENU_ITEM_OUTSIDE_RANGE", "DUPLICATE_MENU_ITEM"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
