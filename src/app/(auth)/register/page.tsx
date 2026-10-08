import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { RegisterForm } from "@/modules/auth/ui/register-form";

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/setup");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#176e61]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Create your account</h1>
        <p className="muted mt-3 leading-7">Start by creating an owner account. You’ll set up your organization next.</p>
        <RegisterForm />
        <p className="muted mt-6 text-center text-sm">Already have an account? <Link className="font-semibold text-[#176e61] hover:underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
