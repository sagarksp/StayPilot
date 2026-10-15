import { voteFoodPollAction } from "./actions";

type ResidentPoll = Readonly<{
  publicId: string;
  mealDate: Date;
  closesAt: Date;
  property: Readonly<{ name: string }>;
  mealType: Readonly<{ name: string }>;
  selectedOptionId: string;
  options: readonly Readonly<{ publicId: string; label: string }>[];
}>;

const field = "h-4 w-4 accent-[#176e61]";
const button = "min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]";

export function ResidentFoodPolls({ orgId, polls, timezone, message }: Readonly<{ orgId: string; polls: readonly ResidentPoll[]; timezone: string; message?: string | null }>) {
  return <section className="surface-card space-y-4 p-5 sm:p-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Food</p><h2 className="mt-1 text-xl font-semibold">Meal polls</h2><p className="muted mt-1 text-sm">Choose an option for an upcoming meal. You can update your vote until voting closes.</p></header>
    {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{message}</p> : null}
    {polls.length ? <div className="grid min-w-0 gap-3 sm:grid-cols-2">{polls.map((poll) => <form action={voteFoodPollAction} className="grid min-w-0 gap-3 rounded-lg border border-slate-200 p-4" key={poll.publicId}>
      <input name="orgId" type="hidden" value={orgId}/><input name="pollId" type="hidden" value={poll.publicId}/>
      <header><h3 className="font-semibold">{poll.mealType.name} · {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(poll.mealDate)}</h3><p className="muted mt-1 text-xs">{poll.property.name} · Closes {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(poll.closesAt)}</p></header>
      <fieldset className="grid gap-2"><legend className="sr-only">Choose your meal poll option</legend>{poll.options.map((option) => <label className="flex min-w-0 items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm" key={option.publicId}><input className={field} defaultChecked={option.publicId === poll.selectedOptionId} name="optionId" required type="radio" value={option.publicId}/><span>{option.label}</span></label>)}</fieldset>
      <button className={button} type="submit">{poll.selectedOptionId ? "Update vote" : "Submit vote"}</button>
    </form>)}</div> : <p className="muted rounded-lg bg-slate-50 p-4 text-sm">There are no open meal polls for your current stay.</p>}
  </section>;
}
