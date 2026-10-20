import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { closeFoodPollAction, createFoodPollAction, replaceFoodMealTypesAction } from "@/modules/food/ui/actions";
import { FoodMenuForm } from "@/modules/food/ui/food-menu-form";

const input = "min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const label = "grid min-w-0 gap-1 text-xs font-medium text-slate-600";
const button = "min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]";
const dateLabel = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
function localDate(timezone: string, dayOffset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + dayOffset));
  return date.toISOString().slice(0, 10);
}

function feedback(query: Record<string, string | undefined>) {
  if (query["meal-types-saved"]) return "Meal types saved.";
  if (query["poll-created"]) return "Meal poll created.";
  if (query["poll-closed"]) return "Voting is closed for that poll.";
  if (query["menu-published"]) return "Menu published to residents.";
  if (query["menu-updated"]) return "Published menu updated.";
  const messages: Record<string, string> = {
    "invalid-input": "Review the fields and enter valid values.",
    "duplicate-meal-type": "Meal type names must be unique.",
    "invalid-poll-time": "Choose a meal date from tomorrow onward and a future voting close time before the meal date.",
    "invalid-meal-type": "Choose an active meal type for this property.",
    "food-poll-already-exists": "A poll already exists for this meal and date.",
    "food-poll-not-open": "That poll is no longer open.",
    "invalid-menu": "Review the menu dates and each date, meal type, and dish.",
    "food-menu-locked": "This menu includes a meal whose voting cutoff has passed, so it can no longer be edited.",
    "menu-item-outside-range": "Every menu item date must be within the menu date range.",
    "duplicate-menu-item": "The same dish cannot be listed twice for one meal and date.",
    "invalid-poll-option": "Keep poll options unique and include no more than one Will Not Eat option.",
  };
  return query["food-error"] ? messages[query["food-error"]] ?? "The action could not be completed." : null;
}

export default async function FoodPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: Promise<Record<string, string | undefined>> }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const data = await foodUseCases.getStaffPage(actor);
  const notice = feedback(query);
  const canManageFood = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER");

  return <section className="space-y-7">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">Resident services</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Food and meal polls</h1><p className="muted mt-2 max-w-3xl leading-6">Owners and assigned managers can manage meal types, menus, and polls for the properties they oversee. Current residents vote or update their choice until the local voting cutoff; votes close automatically at that time.</p></header>
    <ol aria-label="Food poll workflow" className="grid gap-3 sm:grid-cols-3">
      <li className="surface-card p-4"><span className="text-xs font-semibold text-[#2563eb]">STEP 1 · OWNER / MANAGER</span><p className="mt-1 text-sm font-medium">Set property meal types</p></li>
      <li className="surface-card p-4"><span className="text-xs font-semibold text-[#2563eb]">STEP 2 · OWNER / MANAGER</span><p className="mt-1 text-sm font-medium">Schedule meal poll and cutoff</p></li>
      <li className="surface-card p-4"><span className="text-xs font-semibold text-[#2563eb]">STEP 3 · RESIDENT</span><p className="mt-1 text-sm font-medium">Vote from the resident dashboard</p></li>
    </ol>
    {notice ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" role="status">{notice}</p> : null}
    {data.properties.length ? <div className="grid min-w-0 gap-5">{data.properties.map((property) => {
      const types = data.mealTypes.filter((mealType) => mealType.property.publicId === property.publicId);
      return <article className="surface-card min-w-0 space-y-5 p-5 sm:p-6" key={property.publicId}>
        <header><h2 className="text-xl font-semibold">{property.name}</h2><p className="muted mt-1 text-sm">Set meal types, publish menus, and create polls for residents at this property.</p></header>
        <section aria-label="Expected resident meals" className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Expected meals</h3><p className="muted mt-1 text-sm">Current residents minus those who marked themselves away. Use this as a daily kitchen planning estimate.</p></div><a className="min-h-9 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" href={`/api/v1/organizations/${encodeURIComponent(orgId)}/reports/food-attendance?propertyId=${encodeURIComponent(property.publicId)}`}>Download 14-day kitchen plan</a></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(data.attendance.find((entry) => entry.propertyId === property.id)?.days ?? []).slice(0, 7).map((day) => <div className="rounded-md bg-slate-50 p-3 text-sm" key={day.date.toISOString()}><strong>{dateLabel(day.date)}</strong><p className="muted mt-1">{day.expectedMeals} expected · {day.awayResidents} away of {day.totalResidents}</p></div>)}</div>
        </section>
        <form action={replaceFoodMealTypesAction} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <input name="orgId" type="hidden" value={orgId}/><input name="propertyId" type="hidden" value={property.publicId}/>
          <label className={`${label} sm:col-span-2`}>Active meal types, one per line<textarea className={`${input} min-h-28 py-2`} defaultValue={types.map((mealType) => mealType.name).join("\n")} name="mealTypes" placeholder={"Breakfast\nLunch\nDinner"}/></label>
          <p className="muted text-xs sm:col-span-2">Removed meal types become inactive; historical polls keep their original labels.</p>
          <button className={`${button} w-full sm:col-span-2`} type="submit">Save meal types</button>
        </form>
        {canManageFood ? <>
          <section className="space-y-3">
            <header><h3 className="text-lg font-semibold">1. Publish the menu</h3><p className="muted mt-1 text-sm">Add the dishes residents should see. This does not start voting.</p></header>
            <FoodMenuForm orgId={orgId} propertyId={property.publicId} mealTypes={types} initialFrom={localDate(actor.organizationTimezone)} initialTo={localDate(actor.organizationTimezone, 6)}/>
          </section>
          <div className="space-y-3">{data.menus.filter((menu) => menu.propertyId === property.id).map((menu) => <section className="min-w-0 rounded-lg border border-slate-200 p-4" key={menu.publicId}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{menu.title || "Published menu"}</h3><p className="muted mt-1 text-xs">{dateLabel(menu.validFrom)} – {dateLabel(menu.validTo)}</p></div><span className="text-xs font-semibold uppercase text-emerald-700">Published</span></div>
            <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-[#2563eb]">Edit this menu</summary><div className="mt-3"><FoodMenuForm orgId={orgId} propertyId={property.publicId} mealTypes={types} initialFrom={localDate(actor.organizationTimezone)} initialTo={localDate(actor.organizationTimezone, 6)} menu={menu}/></div></details>
          </section>)}{!data.menus.some((menu) => menu.propertyId === property.id) ? <p className="muted rounded-lg bg-slate-50 p-4 text-sm">No menu has been published for this property.</p> : null}</div>
          <section className="space-y-3"><header><h3 className="text-lg font-semibold">2. Ask residents to vote</h3><p className="muted mt-1 text-sm">Choose the meal and day. Residents can vote or change their choice until 11:59 pm the day before.</p></header><form action={createFoodPollAction} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <input name="orgId" type="hidden" value={orgId}/><input name="propertyId" type="hidden" value={property.publicId}/>
            <label className={label}>Meal type<select className={input} name="mealTypeId" required><option value="">Choose a meal type</option>{types.map((type) => <option key={type.publicId} value={type.publicId}>{type.name}</option>)}</select></label>
            <label className={label}>Meal date<input className={input} min={localDate(actor.organizationTimezone, 1)} name="mealDate" required type="date"/></label>
            <p className="muted text-xs sm:col-span-2 xl:col-span-3">Every poll includes a “Will Not Eat” choice. Residents who choose it must add a meal suggestion. Voting opens right away.</p>
            <button className={`${button} w-full sm:col-span-2 xl:col-span-3`} disabled={!types.length} type="submit">Publish poll</button>
          </form></section>
          <div className="space-y-3">{data.polls.filter((poll) => poll.propertyId === property.id).map((poll) => <section className="min-w-0 rounded-lg border border-slate-200 p-4" key={poll.publicId}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{poll.mealType.name} · {dateLabel(poll.mealDate)}</h3><p className="muted mt-1 text-xs">Voting closes {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(poll.closesAt)} · {poll.status.toLowerCase()}</p><p className="muted mt-1 text-xs">{poll.eligibleResidentCount === null ? `${poll.votesReceived} votes received` : `${poll.votesReceived} of ${poll.eligibleResidentCount} eligible residents voted${poll.status === "OPEN" ? ` · ${Math.max(0, poll.eligibleResidentCount - poll.votesReceived)} yet to vote` : ""}`}</p></div>{poll.status === "OPEN" ? <form action={closeFoodPollAction}><input name="orgId" type="hidden" value={orgId}/><input name="pollId" type="hidden" value={poll.publicId}/><button className="min-h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold" type="submit">Close poll</button></form> : null}</div>
            <ul className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{poll.options.map((option) => <li className="min-w-0 rounded-md bg-slate-50 px-3 py-2 text-sm" key={option.publicId}><div className="flex min-w-0 items-center justify-between gap-3"><span className="truncate">{option.label}</span><strong>{option._count.votes}</strong></div>{option.suggestions.length ? <ul className="mt-2 grid gap-1 border-t border-slate-200 pt-2 text-xs text-slate-600">{option.suggestions.map((suggestion, index) => <li key={`${option.publicId}-${index}`}>“{suggestion}”</li>)}</ul> : null}</li>)}</ul>
          </section>)}{!data.polls.some((poll) => poll.propertyId === property.id) ? <p className="muted rounded-lg bg-slate-50 p-4 text-sm">No meal polls yet. Schedule the first poll after the owner configures meal types.</p> : null}</div>
        </> : null}
      </article>;
    })}</div> : <p className="surface-card muted p-6 text-sm">Create an active property before setting up meal polls.</p>}
  </section>;
}
