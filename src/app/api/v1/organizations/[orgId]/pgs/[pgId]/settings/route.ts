import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { propertyStayPolicySchema } from "@/modules/property/application/schemas";
import { propertyUseCases } from "@/modules/property/application";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function PATCH(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; pgId: string }> }>) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const { orgId, pgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = propertyStayPolicySchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    propertyId: pgId,
  });
  if (!parsed.success) return Response.json({ error: "INVALID_SETTINGS", issues: parsed.error.issues }, { status: 400 });
  try {
    await propertyUseCases.updateStayPolicy(actor, parsed.data);
    return Response.json({ data: { propertyId: pgId, noticePeriodDays: parsed.data.noticePeriodDays, lockInMonths: parsed.data.lockInMonths } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
    throw error;
  }
}
