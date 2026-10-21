import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { workspaceAccess } from "@/infrastructure/auth/workspace-access";
import { isPlatformAdminIdentity } from "@/infrastructure/auth/platform-admin-access";
import { createOrganizationAction } from "./actions";
import { getPlatformOwnerInvitation } from "@/infrastructure/platform-admin/owner-invitations";

export default async function OrganizationSetupPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string; invite?: string }> }>) {
  const query = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) redirect(`/login?callbackURL=${encodeURIComponent(`/setup${query.invite ? `?invite=${query.invite}` : ""}`)}`);
  if (isPlatformAdminIdentity(session.user)) redirect("/platform-admin");

  if (await workspaceAccess.hasActiveOrganization(session.user.email)) redirect("/workspace");

  const invitation = query.invite ? await getPlatformOwnerInvitation(query.invite) : null;
  const inviteEmailMatches = invitation?.email.toLowerCase() === session.user.email.toLowerCase();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <Link className="text-sm font-semibold text-[#2563eb]" href="/">StayPilot</Link>
        <p className="mt-5 text-sm font-semibold text-[#2563eb]">Workspace setup</p>
        <h1 className="mt-2 text-3xl font-semibold">{invitation && inviteEmailMatches ? "Name your workspace" : "Owner invitation required"}</h1>
        {invitation && inviteEmailMatches ? <p className="muted mt-3 leading-7">Owner invitation for {invitation.ownerName} is verified. Create your workspace to finish setup.</p> : null}
        {!query.invite ? <p className="muted mt-3 leading-7">New workspaces are created through setup links sent by a StayPilot developer. Ask your developer to send an owner invitation.</p> : null}
        {query.invite && (!invitation || !inviteEmailMatches) ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">This owner invitation is invalid, expired, or belongs to another email address. Sign in with the invited email or request a new link.</p> : null}
        {invitation && inviteEmailMatches ? <p className="muted mt-3 leading-7">You’ll add your first PG next, then organize its floors, rooms, and beds.</p> : null}
        {query.error === "invalid" ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">Enter an organization name between 2 and 200 characters.</p> : null}
        {query.error === "invite" ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">The owner setup link is no longer valid. Ask the StayPilot developer to send another invitation.</p> : null}
        {invitation && inviteEmailMatches ? <form action={createOrganizationAction} className="mt-7 space-y-5">
          <input name="ownerInviteToken" type="hidden" value={query.invite} />
          <label className="block space-y-2 text-sm font-medium" htmlFor="organization-name">
            <span>Organization name</span>
            <input autoComplete="organization" className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" id="organization-name" maxLength={200} minLength={2} name="name" required />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Create organization</button>
        </form> : null}
      </section>
    </main>
  );
}
