import { redirect } from "next/navigation";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentUseCases } from "@/modules/resident/application";
import { DepositTransferForm } from "@/modules/resident/ui/deposit-transfer-form";

const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

function errorMessage(code?: string) {
  switch (code) {
    case "invalid-transfer": return "Enter valid source and destination stays, a positive amount, and a reason.";
    case "transfer-account": return "One of the selected deposit stays is unavailable. Refresh the page and choose again.";
    case "transfer-person": return "A security deposit can only be transferred between stays belonging to the same resident.";
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
  const message = errorMessage(query.error);

  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#2563eb]">FINANCE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Security deposit transfers</h1>
      <p className="muted mt-2 max-w-3xl leading-6">Move a resident’s deposit balance between their own open stays. Deposits cannot be transferred to another person; every move creates paired ledger entries and needs a reason.</p>
    </header>
    {query.transferred ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Deposit transfer recorded. Both deposit ledgers have been updated.</p> : null}
    {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}

    <section className="surface-card min-w-0 p-5 sm:p-6" aria-labelledby="transfer-form-heading">
      <h2 className="text-lg font-semibold" id="transfer-form-heading">Record a transfer</h2>
      <p className="muted mt-1 text-sm">The destination can receive funds up to its required deposit amount. Both accounts must be in properties you can manage.</p>
      <DepositTransferForm accounts={accounts} orgId={orgId} />
    </section>

    <details className="surface-card group min-w-0 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden"><span><h2 className="text-lg font-semibold" id="transfer-history-heading">Recent transfer entries</h2><span className="muted mt-1 block text-sm">{transfers.length} ledger {transfers.length === 1 ? "entry" : "entries"} · up to 50 shown</span></span><WorkspaceIcon className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" name="arrow_drop_down" /></summary>
      {transfers.length ? <ul className="deposit-transfer-history divide-y divide-[#e2e8f0]">{transfers.map((transfer, index) => <li className="flex min-w-0 flex-col justify-between gap-2 break-words px-5 py-4 sm:flex-row sm:items-center sm:px-6" key={`${transfer.reference}-${transfer.type}-${index}`}><div className="min-w-0"><p className="break-words font-medium">{transfer.type === "TRANSFER_IN" ? "Deposit received" : "Deposit sent"} · {transfer.residentName}</p><p className="muted mt-1 break-words text-sm">{transfer.propertyName} · {date(transfer.createdAt)} · Recorded by {transfer.recordedByName}</p><p className="muted mt-1 break-words text-xs">{transfer.description}</p><p className="mt-1 break-all text-xs text-slate-400">Transfer ref {transfer.reference}</p></div><strong className={transfer.type === "TRANSFER_IN" ? "text-emerald-700" : "text-slate-700"}>{transfer.type === "TRANSFER_IN" ? "+" : "−"}{money(transfer.amountPaise < BigInt(0) ? -transfer.amountPaise : transfer.amountPaise)}</strong></li>)}</ul> : <p className="muted px-5 py-10 text-center text-sm">No deposit transfers recorded yet.</p>}
    </details>
  </section>;
}
