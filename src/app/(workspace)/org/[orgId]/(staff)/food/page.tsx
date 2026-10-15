import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { closeFoodPollAction, createFoodPollAction, replaceFoodMealTypesAction } from "@/modules/food/ui/actions";

const input = "min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const label = "grid min-w-0 gap-1 text-xs font-medium text-slate-600";
const button = "min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]";
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
  const messages: Record<string, string> = {
    "invalid-input": "Review the fields and enter valid values.",
    "duplicate-meal-type": "Meal type names must be unique.",
    "invalid-poll-time": "Choose a meal date from tomorrow onward and a future voting close time before the meal date.",
    "invalid-meal-type": "Choose an active meal type for this property.",
    "food-poll-already-exists": "A poll already exists for this meal and date.",
    "food-poll-not-open": "That poll is no longer open.",
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
  const manager = actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER");

  return <section className="space-y-7">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Resident services</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Food and meal polls</h1><p className="muted mt-2 max-w-3xl leading-6">Configure meal choices by property. Managers can create next-day polls and see vote totals; residents can change their vote until the poll closes.</p></header>
    {notice ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" role="status">{notice}</p> : null}
    {data.properties.length ? <div className="grid min-w-0 gap-5">{data.properties.map((property) => {
      const types = data.mealTypes.filter((mealType) => mealType.property.publicId === property.publicId);
      return <article className="surface-card min-w-0 space-y-5 p-5 sm:p-6" key={property.publicId}>
        <header><h2 className="text-xl font-semibold">{property.name}</h2><p className="muted mt-1 text-sm">Meal settings and polls for this property.</p></header>
        <form action={replaceFoodMealTypesAction} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <input name="orgId" type="hidden" value={orgId}/><input name="propertyId" type="hidden" value={property.publicId}/>
          <label className={`${label} sm:col-span-2`}>Active meal types, one per line<textarea className={`${input} min-h-28 py-2`} defaultValue={types.map((mealType) => mealType.name).join("\n")} name="mealTypes" placeholder={"Breakfast\nLunch\nDinner"}/></label>
          <p className="muted text-xs sm:col-span-2">Removed meal types become inactive; historical polls keep their original labels.</p>
          <button className={`${button} w-full sm:col-span-2`} type="submit">Save meal types</button>
        </form>
        {manager ? <>
          <form action={createFoodPollAction} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <input name="orgId" type="hidden" value={orgId}/><input name="propertyId" type="hidden" value={property.publicId}/>
            <label className={label}>Meal type<select className={input} name="mealTypeId" required><option value="">Choose a meal type</option>{types.map((type) => <option key={type.publicId} value={type.publicId}>{type.name}</option>)}</select></label>
            <label className={label}>Meal date<input className={input} min={localDate(actor.organizationTimezone, 1)} name="mealDate" required type="date"/></label>
            <label className={label}>Voting closes at<input className={input} name="closesAt" required type="datetime-local"/></label>
            <label className={`${label} sm:col-span-2 xl:col-span-3`}>Options, one per line<textarea className={`${input} min-h-24 py-2`} defaultValue={"Eating\nNot eating"} name="options" required/></label>
            <button className={`${button} w-full sm:col-span-2 xl:col-span-3`} disabled={!types.length} type="submit">Create meal poll</button>
          </form>
          <div className="space-y-3">{data.polls.filter((poll) => poll.propertyId === property.id).map((poll) => <section className="min-w-0 rounded-lg border border-slate-200 p-4" key={poll.publicId}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{poll.mealType.name} · {dateLabel(poll.mealDate)}</h3><p className="muted mt-1 text-xs">Voting closes {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(poll.closesAt)} · {poll.status.toLowerCase()}</p></div>{poll.status === "OPEN" ? <form action={closeFoodPollAction}><input name="orgId" type="hidden" value={orgId}/><input name="pollId" type="hidden" value={poll.publicId}/><button className="min-h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold" type="submit">Close poll</button></form> : null}</div>
            <ul className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{poll.options.map((option) => <li className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm" key={option.publicId}><span className="truncate">{option.label}</span><strong>{option._count.votes}</strong></li>)}</ul>
          </section>)}</div>
        </> : <p className="muted text-sm">Owner access includes meal-type setup. Individual food poll results are available to the assigned manager, as defined in the access policy.</p>}
      </article>;
    })}</div> : <p className="surface-card muted p-6 text-sm">Create an active property before setting up meal polls.</p>}
  </section>;
}
