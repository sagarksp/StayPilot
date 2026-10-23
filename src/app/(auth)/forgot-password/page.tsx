import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { PasswordResetRequestForm } from "@/modules/auth/ui/password-recovery-forms";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/workspace");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#2563eb]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Reset your password</h1>
        <p className="muted mt-3 leading-7">Enter the email address on your account. If it matches, we’ll send you a secure reset link.</p>
        <PasswordResetRequestForm />
        <p className="muted mt-6 rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6">
          First time setting up a developer account on a fresh database? <Link className="font-semibold text-[#2563eb] hover:underline" href="/register?platformAdmin=1">Create your platform admin account</Link> with an email listed in <code>PLATFORM_ADMIN_EMAILS</code>.
        </p>
        <p className="muted mt-6 text-center text-sm">Remembered your password? <Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
