import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "@/modules/resident/application";
import { residentSelfProfileSchema } from "@/modules/resident/application/schemas";

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("orgId" in body) || typeof body.orgId !== "string") {
    return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  }

  const actor = await getOrganizationActor(body.orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = residentSelfProfileSchema.safeParse({
    name: "name" in body ? body.name : undefined,
    phone: "phone" in body ? body.phone : undefined,
  });
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", issues: parsed.error.issues }, { status: 400 });

  try {
    await residentUseCases.updateResidentSelfProfile(actor, parsed.data);
    return Response.json({ data: { name: parsed.data.name.trim(), phone: parsed.data.phone.trim() } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
