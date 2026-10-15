import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { finalizeInvoiceAction, recordPaymentAction, reversePaymentAction } from "@/modules/billing/ui/actions";

const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

export default async function FinancePage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: Promise<{ finalized?: string; error?: string; "payment-recorded"?: string; "payment-reversed"?: string }> }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const invoices = await billingUseCases.listInvoices(actor);
  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#176e61]">FINANCE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Invoices</h1>
      <p className="muted mt-2 max-w-2xl leading-6">Review resident invoices and record full or partial payments for your accessible properties.</p>
    </header>
    {query.finalized ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Invoice finalized. Its rent and period are now recorded as a financial snapshot.</p> : null}
    {query["payment-recorded"] ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Payment recorded and applied to the invoice balance.</p> : null}
    {query["payment-reversed"] ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Payment reversal recorded and applied to the invoice balance.</p> : null}
    {query.error === "invoice-changed" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">This invoice is no longer available for that action. Refresh to see its current status.</p> : null}
    {query.error === "invalid-payment" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Enter a valid amount, date, and payment method.</p> : null}
    {query.error === "payment-exceeds-balance" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That payment exceeds the current invoice balance. Refresh and try again.</p> : null}
    {query.error?.startsWith("reversal-") || query.error === "payment-not-reversible" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">The payment could not be reversed with those details. Refresh to see the current balance and eligible payments.</p> : null}
    <div className="surface-card overflow-hidden">
      <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Invoices</h2><p className="muted mt-1 text-sm">{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}</p></header>
      {invoices.length ? <div className="divide-y divide-[#e2e8f0]">{invoices.map((invoice) => <article className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6" key={invoice.publicId}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{invoice.residentStay.resident.name}</h3><span className={invoice.status === "DRAFT" ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" : invoice.status === "PAID" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800"}>{invoice.status.replaceAll("_", " ")}</span></div>
          <p className="muted mt-1 text-sm">{invoice.property.name} · Room {invoice.residentStay.bed.room.number} · Bed {invoice.residentStay.bed.label}</p>
          <p className="muted mt-1 text-sm">{invoice.invoiceNumber} · {date(invoice.billingPeriodStart)} – {date(invoice.billingPeriodEnd)} · Due {date(invoice.dueDate)}</p>
          <p className="mt-3 text-sm">{invoice.items.map((item) => item.description).join(" · ")}</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><strong className="text-lg">{money(invoice.totalPaise + invoice.adjustmentPaise)}</strong>{invoice.status === "DRAFT" ? <form action={finalizeInvoiceAction}><input name="orgId" type="hidden" value={orgId} /><input name="invoiceId" type="hidden" value={invoice.publicId} /><button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Review and finalize</button></form> : <div className="text-right text-xs text-slate-500"><p>Paid {money(invoice.amountPaidPaise)}</p><p>Balance {money(invoice.totalPaise + invoice.adjustmentPaise > invoice.amountPaidPaise ? invoice.totalPaise + invoice.adjustmentPaise - invoice.amountPaidPaise : BigInt(0))}</p>{invoice.adjustmentPaise !== BigInt(0) ? <p>Checkout adjustment {money(invoice.adjustmentPaise)}</p> : null}{invoice.finalizedAt ? <p>Finalized {date(invoice.finalizedAt)}</p> : null}</div>}</div>
        {invoice.status !== "DRAFT" ? <div className="sm:col-span-2">
          {invoice.payments.length ? <div className="mb-4 rounded-lg bg-slate-50 p-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Payment history</h4><ul className="mt-2 space-y-2">{invoice.payments.map((payment) => <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm" key={payment.publicId}><span>{payment.transactionType === "REVERSAL" ? "Reversal" : "Payment"} · {date(payment.paymentDate)} · {payment.method.replaceAll("_", " ")}{payment.reference ? ` · Ref ${payment.reference}` : ""}{payment.notes ? <span className="block text-xs text-slate-500">{payment.transactionType === "REVERSAL" ? "Reason: " : "Note: "}{payment.notes}</span> : null}</span><strong className={payment.amountPaise < BigInt(0) ? "text-slate-600" : ""}>{money(payment.amountPaise)}</strong></li>)}</ul></div> : null}
          {invoice.payments.some((payment) => payment.transactionType === "PAYMENT" && payment.purpose === "INVOICE" && payment.depositTransactions.length === 0 && invoice.residentStay.status !== "COMPLETED" && payment.amountPaise + payment.reversals.reduce((sum, reversal) => sum + reversal.amountPaise, BigInt(0)) > BigInt(0)) ? <div className="mb-4 space-y-3">{invoice.payments.filter((payment) => payment.transactionType === "PAYMENT" && payment.purpose === "INVOICE" && payment.depositTransactions.length === 0 && invoice.residentStay.status !== "COMPLETED").map((payment) => {
            const remainingPaise = payment.amountPaise + payment.reversals.reduce((sum, reversal) => sum + reversal.amountPaise, BigInt(0));
            if (remainingPaise <= BigInt(0)) return null;
            return <details className="rounded-lg border border-amber-200 bg-amber-50/50 p-3" key={`reverse-${payment.publicId}`}><summary className="cursor-pointer text-sm font-medium text-amber-900">Reverse payment · remaining {money(remainingPaise)}</summary><form action={reversePaymentAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input name="orgId" type="hidden" value={orgId} /><input name="paymentId" type="hidden" value={payment.publicId} /><input name="idempotencyKey" type="hidden" value={randomUUID()} /><label className="grid gap-1 text-xs font-medium text-slate-600">Amount (₹)<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" defaultValue={(Number(remainingPaise) / 100).toFixed(2)} max={Number(remainingPaise) / 100} min="0.01" name="amount" required step="0.01" type="number" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Reason<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" maxLength={500} minLength={3} name="reason" required /></label><button className="min-h-10 self-end rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100" type="submit">Record reversal</button></form></details>;
          })}</div> : null}
          {invoice.status !== "PAID" ? <form action={recordPaymentAction} className="grid gap-3 rounded-lg border border-[#e2e8f0] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end">
            <input name="orgId" type="hidden" value={orgId} /><input name="invoiceId" type="hidden" value={invoice.publicId} />
            <label className="grid gap-1 text-xs font-medium text-slate-600">Amount (₹)<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" inputMode="decimal" max={Number(invoice.totalPaise + invoice.adjustmentPaise - invoice.amountPaidPaise) / 100} name="amount" placeholder="0.00" required step="0.01" type="number" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Payment date<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" defaultValue={new Date().toISOString().slice(0, 10)} name="paymentDate" required type="date" /></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Method<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue="UPI" name="method"><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">Reference (optional)<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" maxLength={100} name="reference" placeholder="Transaction or receipt ID" /></label>
            <button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Record payment</button>
            <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4">Notes (optional)<input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900" maxLength={500} name="notes" placeholder="Add a short note for your records" /></label>
          </form> : null}
        </div> : null}
      </article>)}</div> : <div className="px-5 py-14 text-center sm:px-6"><h2 className="font-semibold">No rent invoices yet</h2><p className="muted mx-auto mt-2 max-w-lg text-sm leading-6">Drafts appear five days before a stay’s billing date. New stays need rent terms, and the scheduled billing endpoint must be configured with CRON_SECRET.</p></div>}
    </div>
  </section>;
}
