import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { createPropertyAction } from "@/modules/property/ui/actions";

export default async function NewPropertyPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: "invalid" | "duplicate" }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER")) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link className="text-sm font-medium text-[#176e61] hover:underline" href={`/org/${orgId}/properties`}>← Properties</Link>
        <p className="mt-6 text-sm font-semibold text-[#176e61]">Property setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{actor.propertyCount === 0 ? "Add your first property" : "Add a property"}</h1>
        <p className="muted mt-2 leading-7">Add the location details for this PG. You can set up its floors, rooms, and beds right after saving.</p>
      </div>
      {query.error === "invalid" ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">Check the required fields and try again.</p> : null}
      {query.error === "duplicate" ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">A property with that code already exists in this organization. Choose a different code.</p> : null}
      <form action={createPropertyAction} className="surface-card grid gap-5 p-6 sm:grid-cols-2">
        <input name="orgId" type="hidden" value={orgId} />
        <Field label="Property name" name="name" required />
        <Field label="Property code" name="code" />
        <div className="sm:col-span-2"><Field label="Address line 1" name="addressLine1" required /></div>
        <div className="sm:col-span-2"><Field label="Address line 2" name="addressLine2" /></div>
        <Field label="City" name="city" required />
        <Field label="State" name="state" required />
        <Field label="Postal code" name="postalCode" required />
        <Field label="Contact phone" name="contactPhone" type="tel" />
        <Field label="Contact email" name="contactEmail" type="email" />
        <div className="flex flex-wrap justify-end gap-3 border-t border-[#dce4e0] pt-5 sm:col-span-2">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold" href={`/org/${orgId}/properties`}>Cancel</Link>
          <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Save and add layout</button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  required = false,
  type = "text",
}: Readonly<{ label: string; name: string; required?: boolean; type?: string }>) {
  return (
    <label className="block space-y-2 text-sm font-medium" htmlFor={name}>
      <span>{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
      <input className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15" id={name} name={name} required={required} type={type} />
    </label>
  );
}
