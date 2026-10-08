import { SignInForm } from "@/modules/auth/ui/sign-in-form";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/workspace");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#176e61]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <p className="muted mt-3 leading-7">Sign in to your StayPilot workspace.</p>
        <SignInForm />
        <p className="muted mt-6 text-center text-sm">New to StayPilot? <Link className="font-semibold text-[#176e61] hover:underline" href="/register">Create a workspace</Link></p>
      </section>
    </main>
  );
}
