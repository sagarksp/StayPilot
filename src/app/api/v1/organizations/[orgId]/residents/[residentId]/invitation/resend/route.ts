import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentInvitationUseCases } from "@/infrastructure/auth/prisma-resident-invitations";
import { ResidentInvitationError } from "@/modules/auth/application/resident-invitations";

export async function POST(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/residents/[residentId]/invitation/resend">) {
  const { orgId, residentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const invitation = await residentInvitationUseCases.issue(actor, residentId);
    return Response.json({ data: invitation }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ResidentInvitationError) {
      const status = error.code === "STAFF_REQUIRED" ? 403
        : error.code === "ACCOUNT_UNAVAILABLE" ? 409
          : error.code === "INVITATION_ALREADY_ACCEPTED" ? 409
            : 404;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "RESIDENT_INVITATION_FAILED" }, { status: 500 });
  }
}
