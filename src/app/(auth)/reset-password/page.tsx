import Link from "next/link";
import { PasswordResetForm } from "@/modules/auth/ui/password-recovery-forms";

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }>) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] ?? null : query.token ?? null;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#176e61]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Choose a new password</h1>
        <p className="muted mt-3 leading-7">Use at least 8 characters. This will sign out your other StayPilot sessions.</p>
        <PasswordResetForm invalidLink={error === "INVALID_TOKEN"} token={token} />
        <p className="muted mt-6 text-center text-sm">Need a different link? <Link className="font-semibold text-[#176e61] hover:underline" href="/forgot-password">Request a password reset</Link></p>
      </section>
    </main>
  );
}
