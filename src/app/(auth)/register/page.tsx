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
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(isPlatformAdminIdentity(session.user) ? "/platform-admin" : `/setup${query.invite ? `?invite=${encodeURIComponent(query.invite)}` : ""}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#2563eb]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Create your account</h1>
        <p className="muted mt-3 leading-7">{invitation ? `You were invited to create an owner account for ${invitation.ownerName}. Set a password and verify ${invitation.email} to continue.` : "Start by creating an owner account. You’ll set up your organization next."}</p>
        {query.invite && !invitation ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">This owner setup link is invalid or expired. Ask the StayPilot developer to send a new invitation.</p> : null}
        <RegisterForm ownerInviteToken={invitation ? query.invite : undefined} invitedOwner={invitation ? { name: invitation.ownerName, email: invitation.email } : undefined} />
        <p className="muted mt-6 text-center text-sm">Already have an account? <Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
