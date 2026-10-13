import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { propertyUseCases } from "@/modules/property/application";
import { ManagerInvitations } from "@/modules/auth/ui/manager-invitations";

export default async function TeamPage({ params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER")) redirect(`/org/${orgId}/manager`);
  const [team, properties] = await Promise.all([managerInvitationUseCases.getTeam(actor), propertyUseCases.listProperties(actor)]);

  return <section className="space-y-6">
    <header><p className="text-sm font-semibold text-[#176e61]">TEAM ACCESS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Staff &amp; Managers</h1><p className="muted mt-2 max-w-3xl leading-6">Invite managers to your organization and set the properties they can manage. Invitees must activate the link using the invited email address.</p></header>
    <ManagerInvitations orgId={orgId} properties={properties.filter((property) => property.status === "ACTIVE").map(({ id, name }) => ({ id, name }))} team={team} />
  </section>;
}
