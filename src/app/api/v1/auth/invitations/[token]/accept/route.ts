import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { ManagerInvitationError } from "@/modules/auth/application/manager-invitations";

export async function POST(_request: Request, { params }: RouteContext<"/api/v1/auth/invitations/[token]/accept">) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const invitation = await managerInvitationUseCases.accept(token, session.user.email, session.user.name);
    const destination = invitation.roleCode === "RESIDENT" ? "resident" : "properties";
    return Response.json({
      data: {
        organizationId: invitation.organizationId,
        redirectTo: `/org/${encodeURIComponent(invitation.organizationId)}/${destination}`,
      },
    });
  } catch (error) {
    if (error instanceof ManagerInvitationError) {
      const status = error.code === "ACCOUNT_UNAVAILABLE" ? 403 : 400;
      return Response.json({ error: error.code === "ACCOUNT_UNAVAILABLE" ? error.code : "INVITATION_UNAVAILABLE" }, { status });
    }
    return Response.json({ error: "INVITATION_ACCEPTANCE_FAILED" }, { status: 500 });
  }
}
