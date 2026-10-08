import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { workspaceAccess } from "@/infrastructure/auth/workspace-access";

export default async function WorkspaceRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) redirect("/login");

  const destination = await workspaceAccess.getDestination(session.user.email);
  if (!destination) redirect("/setup");

  if (destination.area === "resident") {
    redirect(`/org/${destination.organizationId}/resident`);
  }

  const actor = await getOrganizationActor(destination.organizationId);
  if (!actor) redirect("/login");
  redirect(`/org/${destination.organizationId}/${actor.roles.includes("OWNER") ? "owner" : "properties"}`);
}
