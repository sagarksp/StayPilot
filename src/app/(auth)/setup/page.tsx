import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { workspaceAccess } from "@/infrastructure/auth/workspace-access";
import { isPlatformAdminIdentity } from "@/infrastructure/auth/platform-admin-access";
import { createOrganizationAction } from "./actions";

export default async function OrganizationSetupPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) redirect("/login");
  if (isPlatformAdminIdentity(session.user)) redirect("/platform-admin");

  if (await workspaceAccess.hasActiveOrganization(session.user.email)) redirect("/workspace");

  const query = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <Link className="text-sm font-semibold text-[#2563eb]" href="/">StayPilot</Link>
        <p className="mt-5 text-sm font-semibold text-[#2563eb]">Workspace setup</p>
        <h1 className="mt-2 text-3xl font-semibold">Name your workspace</h1>
        <p className="muted mt-3 leading-7">You’ll add your first PG next, then organize its floors, rooms, and beds.</p>
        {query.error === "invalid" ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">Enter an organization name between 2 and 200 characters.</p> : null}
        <form action={createOrganizationAction} className="mt-7 space-y-5">
          <label className="block space-y-2 text-sm font-medium" htmlFor="organization-name">
            <span>Organization name</span>
            <input autoComplete="organization" className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" id="organization-name" maxLength={200} minLength={2} name="name" required />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Create organization</button>
        </form>
      </section>
    </main>
  );
}
