import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { RegisterForm } from "@/modules/auth/ui/register-form";
import { isPlatformAdminIdentity } from "@/infrastructure/auth/platform-admin-access";
import { getPlatformOwnerInvitation } from "@/infrastructure/platform-admin/owner-invitations";

export default async function RegisterPage({ searchParams }: Readonly<{ searchParams: Promise<{ invite?: string }> }>) {
  const query = await searchParams;
  const invitation = query.invite ? await getPlatformOwnerInvitation(query.invite) : null;
  if (!query.invite) redirect("/login");
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(isPlatformAdminIdentity(session.user) ? "/platform-admin" : `/setup${query.invite ? `?invite=${encodeURIComponent(query.invite)}` : ""}`);
  const invitationIsValid = Boolean(invitation);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#2563eb]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">{invitationIsValid ? "Create your owner account" : "Owner invitation required"}</h1>
        {invitation ? <p className="muted mt-3 leading-7">You were invited to create an owner account for {invitation.ownerName}. {invitation.demoDurationHours ? `Your demo access will last ${invitation.demoDurationHours} hours after workspace setup.` : ""} Set a password and verify {invitation.email} to continue.</p> : <p className="muted mt-3 leading-7">Owner accounts are created through setup links sent by a StayPilot developer. Ask your developer to send you an invitation.</p>}
        {query.invite && !invitation ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">This owner setup link is invalid or expired. Ask the StayPilot developer to send a new invitation.</p> : null}
        {invitation ? <RegisterForm ownerInviteToken={query.invite} invitedOwner={{ name: invitation.ownerName, email: invitation.email }} /> : null}
        <p className="muted mt-6 text-center text-sm">Already have an account? <Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
