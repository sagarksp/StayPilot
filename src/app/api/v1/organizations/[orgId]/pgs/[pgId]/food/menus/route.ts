import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodMenuRangeSchema, foodMenuSchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string; pgId: string }> }>;

export async function GET(request: Request, { params }: Context) {
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const range = foodMenuRangeSchema.safeParse({ from: query.get("from") ?? undefined, to: query.get("to") ?? undefined });
  if (!range.success) return Response.json({ error: "INVALID_DATE_RANGE", issues: range.error.issues }, { status: 400 });
  try {
    return Response.json({ data: await foodUseCases.listMenus(actor, pgId, range.data.from, range.data.to) });
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
  const parsed = foodMenuSchema.safeParse(candidate);
  if (!parsed.success) return Response.json({ error: "INVALID_FOOD_MENU", issues: parsed.error.issues }, { status: 400 });
  try {
    const menu = await foodUseCases.createMenu(actor, parsed.data);
    return Response.json({ data: { id: menu.publicId, status: menu.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && ["INVALID_MEAL_TYPE", "MENU_ITEM_OUTSIDE_RANGE", "DUPLICATE_MENU_ITEM"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
