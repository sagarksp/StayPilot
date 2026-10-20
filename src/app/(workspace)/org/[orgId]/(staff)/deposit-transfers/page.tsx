import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentUseCases } from "@/modules/resident/application";
import { transferSecurityDepositAction } from "@/modules/resident/ui/actions";

const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

function errorMessage(code?: string) {
  switch (code) {
    case "invalid-transfer": return "Enter valid source and destination stays, a positive amount, and a reason.";
    case "transfer-account": return "One of the selected deposit accounts is unavailable. Refresh the page and choose again.";
    case "transfer-balance": return "The transfer amount exceeds the source account’s current balance.";
    case "transfer-limit": return "The destination transfer exceeds its required security deposit.";
    case "transfer-conflict": return "A deposit account changed while you were submitting. Refresh and try again.";
    default: return null;
  }
}

export default async function DepositTransfersPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string; transferred?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const [accounts, transfers] = await Promise.all([
    residentUseCases.listDepositTransferAccounts(actor),
    residentUseCases.listDepositTransfers(actor),
  ]);
  const activeAccounts = accounts.filter((account) => ["ACTIVE", "NOTICE_PERIOD"].includes(account.stayStatus));
  const sources = activeAccounts.filter((account) => account.balancePaise > BigInt(0));
  const destinations = activeAccounts.filter((account) => account.requiredAmountPaise > account.balancePaise);
  const message = errorMessage(query.error);

  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#2563eb]">FINANCE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Security deposit transfers</h1>
      <p className="muted mt-2 max-w-3xl leading-6">Move deposit balance between open stays in this organization. Every transfer creates paired, permanent ledger entries and needs a reason.</p>
    </header>
    {query.transferred ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Deposit transfer recorded. Both deposit ledgers have been updated.</p> : null}
    {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}

    <section className="surface-card p-5 sm:p-6" aria-labelledby="transfer-form-heading">
      <h2 className="text-lg font-semibold" id="transfer-form-heading">Record a transfer</h2>
      <p className="muted mt-1 text-sm">The destination can receive funds up to its required deposit amount. Both accounts must be in properties you can manage.</p>
      {sources.length && destinations.length ? <form action={transferSecurityDepositAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        <input name="orgId" type="hidden" value={orgId} />
        <label className="grid gap-1 text-sm font-medium">Transfer from<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="sourceStayId" required defaultValue=""><option disabled value="">Choose a source account</option>{sources.map((account) => <option key={account.stayId} value={account.stayId}>{account.residentName} · {account.propertyName} · Room {account.roomNumber}, Bed {account.bedLabel} · Available {money(account.balancePaise)}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Transfer to<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="destinationStayId" required defaultValue=""><option disabled value="">Choose a destination account</option>{destinations.map((account) => <option key={account.stayId} value={account.stayId}>{account.residentName} · {account.propertyName} · Room {account.roomNumber}, Bed {account.bedLabel} · Deposit remaining {money(account.requiredAmountPaise - account.balancePaise)}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Amount (₹)<input className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" inputMode="decimal" max="90000000" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></label>
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">Reason<textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={400} minLength={3} name="reason" placeholder="Explain why this deposit is being moved" required rows={3} /></label>
        <div className="sm:col-span-2"><button className="min-h-11 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Transfer deposit</button></div>
      </form> : <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">A transfer needs an open source account with a positive balance and an active destination account with deposit capacity. No eligible pair is available in your assigned properties.</div>}
    </section>

    <section className="surface-card overflow-hidden" aria-labelledby="transfer-history-heading">
      <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold" id="transfer-history-heading">Recent transfer entries</h2><p className="muted mt-1 text-sm">Showing up to 50 ledger entries for your assigned properties.</p></header>
      {transfers.length ? <ul className="divide-y divide-[#e2e8f0]">{transfers.map((transfer, index) => <li className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-6" key={`${transfer.reference}-${transfer.type}-${index}`}><div><p className="font-medium">{transfer.type === "TRANSFER_IN" ? "Deposit received" : "Deposit sent"} · {transfer.residentName}</p><p className="muted mt-1 text-sm">{transfer.propertyName} · {date(transfer.createdAt)} · Recorded by {transfer.recordedByName}</p><p className="muted mt-1 text-xs">{transfer.description}</p><p className="mt-1 text-xs text-slate-400">Transfer ref {transfer.reference}</p></div><strong className={transfer.type === "TRANSFER_IN" ? "text-emerald-700" : "text-slate-700"}>{transfer.type === "TRANSFER_IN" ? "+" : "−"}{money(transfer.amountPaise < BigInt(0) ? -transfer.amountPaise : transfer.amountPaise)}</strong></li>)}</ul> : <p className="muted px-5 py-10 text-center text-sm">No deposit transfers recorded yet.</p>}
    </section>
  </section>;
}
