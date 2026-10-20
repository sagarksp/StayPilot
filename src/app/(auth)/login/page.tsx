import { SignInForm } from "@/modules/auth/ui/sign-in-form";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";

function internalCallback(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/workspace";
  const target = new URL(candidate, "https://staypilot.invalid");
  return target.origin === "https://staypilot.invalid" ? `${target.pathname}${target.search}${target.hash}` : "/workspace";
}

export default async function SignInPage({ searchParams }: Readonly<{ searchParams: Promise<{ callbackURL?: string | string[]; verified?: string }> }>) {
  const query = await searchParams;
  const callbackURL = internalCallback(query.callbackURL);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(callbackURL);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#2563eb]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <p className="muted mt-3 leading-7">Sign in to your StayPilot workspace.</p>
        {query.verified === "1" ? <p className="mt-5 rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-3 text-sm text-[#24594b]" role="status">Your email is verified. Sign in to continue.</p> : null}
        <SignInForm callbackURL={callbackURL} />
        <p className="muted mt-6 text-center text-sm">New to StayPilot? <Link className="font-semibold text-[#2563eb] hover:underline" href="/register">Create a workspace</Link></p>
      </section>
    </main>
  );
}
