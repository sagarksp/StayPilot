import { voteFoodPollAction } from "./actions";
import styles from "./resident-food-polls.module.css";

type ResidentPoll = Readonly<{
  publicId: string;
  mealDate: Date;
  closesAt: Date;
  property: Readonly<{ name: string }>;
  mealType: Readonly<{ name: string }>;
  selectedOptionId: string;
  options: readonly Readonly<{ publicId: string; label: string }>[];
}>;

type ResidentMenu = Readonly<{
  publicId: string;
  title: string | null;
  validFrom: Date;
  validTo: Date;
  items: readonly Readonly<{ menuDate: Date; dishName: string; description: string | null; mealType: Readonly<{ name: string }> }>[];
}>;

export function ResidentFoodMenu({ menus }: Readonly<{ menus: readonly ResidentMenu[] }>) {
  return <section aria-labelledby="food-menu-title" className={styles.section}>
    <header><p>Food</p><h2 id="food-menu-title">Upcoming menu</h2><p>Published meals for your property over the next two weeks.</p></header>
    {menus.length ? <div className={styles.menuList}>{menus.map((menu) => <article className={styles.menuCard} key={menu.publicId}>
      <h3>{menu.title || `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(menu.validFrom)} – ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(menu.validTo)}`}</h3>
      {menu.items.length ? <ul>{menu.items.map((item, index) => <li key={`${menu.publicId}-${item.menuDate.toISOString()}-${index}`}><time dateTime={item.menuDate.toISOString().slice(0, 10)}>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(item.menuDate)}</time><div><strong>{item.mealType.name}</strong><span>{item.dishName}{item.description ? ` · ${item.description}` : ""}</span></div></li>)}</ul> : <p className={styles.empty}>No dishes have been added to this menu yet.</p>}
    </article>)}</div> : <p className={styles.empty}>There is no published menu for the upcoming days.</p>}
  </section>;
}

export function ResidentFoodPolls({ orgId, polls, timezone, message }: Readonly<{ orgId: string; polls: readonly ResidentPoll[]; timezone: string; message?: string | null }>) {
  return <section aria-labelledby="food-polls-title" className={`${styles.section} space-y-4`}>
    <header><p>Food</p><h2 id="food-polls-title">Meal polls</h2><p>Choose an option for an upcoming meal. You can update your vote until voting closes.</p></header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {polls.length ? <div className={styles.pollGrid}>{polls.map((poll) => <form action={voteFoodPollAction} className={styles.pollForm} key={poll.publicId}>
      <input name="orgId" type="hidden" value={orgId} /><input name="pollId" type="hidden" value={poll.publicId} />
      <header><h3>{poll.mealType.name} · {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(poll.mealDate)}</h3><p>{poll.property.name} · Closes {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(poll.closesAt)}</p></header>
      <fieldset className={styles.choices}><legend className="sr-only">Choose your meal poll option</legend>{poll.options.map((option) => <label className={styles.choice} key={option.publicId}><input defaultChecked={option.publicId === poll.selectedOptionId} name="optionId" required type="radio" value={option.publicId} /><span>{option.label}</span></label>)}</fieldset>
      {poll.selectedOptionId ? <p className="text-xs text-slate-600">Your current choice: <strong>{poll.options.find((option) => option.publicId === poll.selectedOptionId)?.label ?? "Choose an option"}</strong></p> : null}
      <button className={styles.submit} type="submit">{poll.selectedOptionId ? "Save my choice" : "Submit my choice"}</button>
    </form>)}</div> : <p className={styles.empty}>There are no open meal polls for your current stay.</p>}
  </section>;
}
