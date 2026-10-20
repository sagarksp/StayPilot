import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentFoodAvailabilitySchema } from "@/modules/food/application/schemas";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ availabilityId: string }> }>;

export async function PUT(request: Request, { params }: Context) {
  const { availabilityId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_BODY" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("orgId" in body) || typeof body.orgId !== "string") return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(body.orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = residentFoodAvailabilitySchema.safeParse({ availabilityId, startsOn: "startsOn" in body ? body.startsOn : undefined, endsOn: "endsOn" in body ? body.endsOn : undefined });
  if (!parsed.success) return Response.json({ error: "INVALID_AVAILABILITY", issues: parsed.error.issues }, { status: 400 });
  try {
    return Response.json({ data: await foodUseCases.saveAvailabilityForResident(actor, parsed.data) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_AVAILABILITY_NOT_FOUND") return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && ["FOOD_AVAILABILITY_OUTSIDE_STAY", "FOOD_AVAILABILITY_OVERLAP"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { availabilityId } = await params;
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    await foodUseCases.cancelAvailabilityForResident(actor, availabilityId);
    return Response.json({ data: { availabilityId, status: "CANCELLED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "FOOD_AVAILABILITY_NOT_FOUND") return Response.json({ error: error.message }, { status: 404 });
    throw error;
  }
}
