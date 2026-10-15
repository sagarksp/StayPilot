import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { ResidentComplaints } from "@/modules/complaint/ui/resident-complaints";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { ResidentFoodPolls } from "@/modules/food/ui/resident-food-polls";
import { residentUseCases } from "@/modules/resident/application";
import { submitResidentMoveOutNoticeAction } from "@/modules/resident/ui/actions";


function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatCurrency(paise: bigint) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
}

function localToday(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function errorMessage(code?: string) {
  switch (code) {
    case "invalid-notice": return "Enter a valid move-out date.";
    case "notice-too-short": return "Choose a date that allows the full property notice period.";
    case "lock-in-active": return "Your requested date is within the lock-in period. Contact the property manager to discuss an exception.";
    case "notice-exists": return "A move-out notice has already been submitted for this stay.";
    case "invalid-notice-date": return "Choose a move-out date that is today or later.";
    case "notice-unavailable": return "A move-out notice cannot be submitted for this stay.";
    default: return null;
  }
}

export default async function ResidentHomePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string; "complaint-error"?: string; "complaint-created"?: string; "food-error"?: string; "food-voted"?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("RESIDENT")) notFound();

  let resident;
  try {
    resident = await residentUseCases.getResidentPortal(actor);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  const error = errorMessage(query.error);
  if (!resident) {
    return (
      <section className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Resident portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your account is not linked yet</h1>
          <p className="muted mt-2 max-w-2xl leading-6">Accept the resident activation invitation sent by your property manager using this account. If you do not have an invitation, ask the manager to resend it from your resident profile.</p>
        </header>
        <section className="surface-card p-5 sm:p-6"><p className="text-sm font-semibold text-[#176e61]">SIGNED-IN EMAIL</p><p className="mt-2 text-lg font-medium">{actor.userEmail}</p></section>
      </section>
    );
  }

  const today = localToday(actor.organizationTimezone);
  const currentStay = resident.stays.find((stay) => ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"].includes(stay.status) && stay.startDate.toISOString().slice(0, 10) <= today && (!stay.endDate || stay.endDate.toISOString().slice(0, 10) >= today)) ?? null;
  const minimumDateByNotice = currentStay ? addDays(today, currentStay.noticePeriodDays) : today;
  const lockInDate = currentStay?.lockInEndDate?.toISOString().slice(0, 10);
  const minimumMoveOutDate = lockInDate && lockInDate > minimumDateByNotice ? lockInDate : minimumDateByNotice;
  const invoices = resident.stays.flatMap((stay) => stay.invoices.map((invoice) => ({ ...invoice, stayProperty: stay.propertyName })))
    .filter((invoice) => ["FINALIZED", "PARTIALLY_PAID", "PAID"].includes(invoice.status))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const complaints = await complaintUseCases.listForResident(actor);
  const foodPolls = await foodUseCases.listForResident(actor);
  const invoiceBalance = (invoice: typeof invoices[number]) => invoice.totalPaise + invoice.adjustmentPaise - invoice.amountPaidPaise;
  const outstandingInvoices = invoices.filter((invoice) => invoiceBalance(invoice) > BigInt(0));
  const totalOutstandingPaise = outstandingInvoices.reduce((total, invoice) => total + invoiceBalance(invoice), BigInt(0));
  const overdueInvoiceCount = outstandingInvoices.filter((invoice) => invoice.dueDate.toISOString().slice(0, 10) < today).length;
  const openComplaintCount = complaints.filter((complaint) => complaint.status === "OPEN" || complaint.status === "IN_PROGRESS").length;
  const nextDueInvoice = outstandingInvoices[0] ?? null;

  return (
    <section className="space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Resident dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back, {resident.name}</h1>
        <p className="muted mt-2 max-w-2xl leading-6">A clear view of your stay, bills, and requests.</p>
        <nav aria-label="Dashboard sections" className="mt-5 flex flex-wrap gap-2">
          <a className="rounded-full border border-[#dce4e0] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-[#176e61] hover:text-[#176e61]" href="#stay-heading">My stay</a>
          <a className="rounded-full border border-[#dce4e0] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-[#176e61] hover:text-[#176e61]" href="#invoices-heading">Bills and receipts</a>
          <a className="rounded-full border border-[#dce4e0] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-[#176e61] hover:text-[#176e61]" href="#food-heading">Food polls</a>
          <a className="rounded-full border border-[#dce4e0] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-[#176e61] hover:text-[#176e61]" href="#support-heading">Support requests</a>
        </nav>
      </header>

      {error ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{error}</p> : null}

      <section aria-label="Account overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard label="Outstanding balance" value={formatCurrency(totalOutstandingPaise)} detail={outstandingInvoices.length ? `${outstandingInvoices.length} unpaid ${outstandingInvoices.length === 1 ? "bill" : "bills"}` : "You're all caught up"} href="#invoices-heading" tone={totalOutstandingPaise > BigInt(0) ? "amber" : "green"} />
        <OverviewCard label="Overdue bills" value={String(overdueInvoiceCount)} detail={overdueInvoiceCount ? "Please review your unpaid bills" : "No overdue bills"} href="#invoices-heading" tone={overdueInvoiceCount ? "amber" : "neutral"} />
        <OverviewCard label="Open requests" value={String(openComplaintCount)} detail={openComplaintCount ? "Updates from your property team" : "No requests need attention"} href="#support-heading" tone="neutral" />
        <OverviewCard label="Security deposit" value={formatCurrency(currentStay?.securityDeposit?.balancePaise ?? BigInt(0))} detail={currentStay ? "Current stay balance" : "No active stay"} href={currentStay ? "#deposit-heading" : "#stay-heading"} tone="green" />
      </section>

      {currentStay ? (
        <section className="surface-card p-5 sm:p-6" aria-labelledby="stay-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm font-semibold text-[#176e61]">CURRENT STAY</p><h2 className="mt-1 text-xl font-semibold" id="stay-heading">{currentStay.propertyName}</h2><p className="muted mt-1 text-sm">{currentStay.floorName} · Room {currentStay.roomNumber} · Bed {currentStay.bedLabel}</p></div>
            <span className="rounded-full bg-[#eaf5ef] px-3 py-1.5 text-sm font-semibold text-[#256b4c]">{currentStay.status === "NOTICE_PERIOD" ? "Move-out notice submitted" : "Currently staying"}</span>
          </div>
          <div className="mt-5 grid gap-3 border-t border-[#e2e8f0] pt-4 sm:grid-cols-3">
            <Summary label="Move-in date" value={formatDate(currentStay.startDate)} />
            <Summary label="Monthly rent" value={currentStay.rent ? formatCurrency(currentStay.rent.amountPaise) : "Not set"} />
            <Summary label="Security deposit balance" value={formatCurrency(currentStay.securityDeposit?.balancePaise ?? BigInt(0))} />
          </div>
          {currentStay.checkoutNotice ? <p className="mt-4 rounded-lg bg-[#f5f7f5] p-3 text-sm">Move-out requested for <strong>{currentStay.checkoutNotice.requestedCheckoutDate ? formatDate(currentStay.checkoutNotice.requestedCheckoutDate) : "date pending"}</strong>. Contact your property manager if your plans change.</p> : (
            <div className="mt-5 border-t border-[#e2e8f0] pt-5">
              <h3 className="font-semibold">Submit a move-out notice</h3>
              <p className="muted mt-1 text-sm">Your property requires {currentStay.noticePeriodDays} days’ notice. The earliest date also respects your lock-in terms.</p>
              <form action={submitResidentMoveOutNoticeAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input name="orgId" type="hidden" value={orgId} />
                <input name="stayId" type="hidden" value={currentStay.id} />
                <label className="grid gap-1 text-sm font-medium" htmlFor="requestedCheckoutDate">Requested move-out date<input className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" id="requestedCheckoutDate" min={minimumMoveOutDate} name="requestedCheckoutDate" required type="date" /></label>
                <button className="min-h-11 rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Submit notice</button>
              </form>
            </div>
          )}
        </section>
      ) : resident.currentReservation ? (
        <section className="surface-card p-5 sm:p-6"><p className="text-sm font-semibold text-[#176e61]">UPCOMING STAY</p><h2 className="mt-2 text-xl font-semibold" id="stay-heading">{resident.currentReservation.propertyName}</h2><p className="muted mt-1 text-sm">Room {resident.currentReservation.roomNumber} · Bed {resident.currentReservation.bedLabel}</p><p className="mt-3 text-sm">Move-in window: {formatDate(resident.currentReservation.startDate)} – {formatDate(resident.currentReservation.endDate)}</p></section>
      ) : <section className="surface-card p-5 sm:p-6"><h2 className="text-lg font-semibold" id="stay-heading">No current stay</h2><p className="muted mt-1 text-sm">Your previous stays and bills remain available below.</p></section>}

      <section aria-label="Next payment" className="surface-card flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-[#176e61] p-5 sm:p-6">
        {nextDueInvoice ? <>
          <div><p className="text-sm font-semibold text-[#176e61]">NEXT PAYMENT</p><h2 className="mt-1 text-lg font-semibold">{nextDueInvoice.invoiceNumber} · {nextDueInvoice.stayProperty}</h2><p className="muted mt-1 text-sm">Due {formatDate(nextDueInvoice.dueDate)}{nextDueInvoice.dueDate.toISOString().slice(0, 10) < today ? " · Overdue" : ""}</p></div>
          <div className="flex items-center gap-4"><strong className="text-lg">{formatCurrency(invoiceBalance(nextDueInvoice))}</strong><a className="rounded-lg bg-[#176e61] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" href="#invoices-heading">View bill</a></div>
        </> : <div><p className="text-sm font-semibold text-[#176e61]">NEXT PAYMENT</p><h2 className="mt-1 text-lg font-semibold">You’re all caught up</h2><p className="muted mt-1 text-sm">Any finalized bills will appear here when they’re ready.</p></div>}
      </section>

      <ResidentComplaints orgId={orgId} stays={resident.stays} complaints={complaints} errorCode={query["complaint-error"]} created={query["complaint-created"]} />

      <div id="food-heading"><ResidentFoodPolls orgId={orgId} polls={foodPolls} timezone={actor.organizationTimezone} message={query["food-voted"] ? "Your meal choice has been saved." : query["food-error"] === "poll-closed" ? "Voting has closed for that poll." : query["food-error"] ? "Your vote could not be saved. Choose an option from an open poll and try again." : null} /></div>

      <section className="space-y-3" aria-labelledby="invoices-heading">
        <div><p className="text-sm font-semibold text-[#176e61]">BILLING</p><h2 className="mt-1 text-xl font-semibold" id="invoices-heading">Invoices and receipts</h2></div>
        {invoices.length ? invoices.map((invoice) => {
          const effectiveTotal = invoice.totalPaise + invoice.adjustmentPaise;
          const balance = effectiveTotal > invoice.amountPaidPaise ? effectiveTotal - invoice.amountPaidPaise : BigInt(0);
          return <article className="surface-card p-5" key={invoice.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{invoice.invoiceNumber}</h3><p className="muted mt-1 text-sm">{invoice.invoiceType === "ELECTRICITY" ? "Electricity" : "Rent"} · {invoice.stayProperty} · Due {formatDate(invoice.dueDate)}</p><p className="muted mt-1 text-xs">Billing period: {formatDate(invoice.billingPeriodStart)} – {formatDate(invoice.billingPeriodEnd)}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${balance === BigInt(0) ? "bg-[#eaf5ef] text-[#256b4c]" : "bg-[#fff4df] text-[#8a5a00]"}`}>{balance === BigInt(0) ? "Paid" : invoice.amountPaidPaise > BigInt(0) ? "Partially paid" : "Due"}</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-[#e2e8f0] pt-3 text-sm">
              {invoice.items.map((item, index) => <div className="flex justify-between gap-4" key={`${invoice.id}-${index}`}><span>{item.description}{item.quantity !== 1 ? ` × ${item.quantity}` : ""}</span><span className="font-medium">{formatCurrency(item.lineTotalPaise)}</span></div>)}
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-[#e2e8f0] pt-3 text-sm"><span>Total {formatCurrency(effectiveTotal)}{invoice.adjustmentPaise !== BigInt(0) ? ` (checkout adjustment ${invoice.adjustmentPaise > BigInt(0) ? "+" : "−"}${formatCurrency(invoice.adjustmentPaise > BigInt(0) ? invoice.adjustmentPaise : -invoice.adjustmentPaise)})` : ""} · Paid {formatCurrency(invoice.amountPaidPaise)}</span><strong>Balance {formatCurrency(balance)}</strong></div>
            {invoice.payments.length ? <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-[#176e61]">Payment activity ({invoice.payments.length})</summary><ul className="mt-2 space-y-1 text-sm text-slate-600">{invoice.payments.map((payment, index) => <li key={`${invoice.id}-payment-${index}`}>{payment.transactionType === "REVERSAL" ? "Reversal" : "Payment"} · {formatDate(payment.paymentDate)} · {formatCurrency(payment.amountPaise)} · {payment.method.replaceAll("_", " ")}{payment.reference ? ` · Ref ${payment.reference}` : ""}{payment.transactionType === "REVERSAL" && payment.notes ? ` · Reason: ${payment.notes}` : ""}</li>)}</ul></details> : null}
          </article>;
        }) : <p className="surface-card muted p-5 text-sm">No finalized invoices yet. Draft bills will appear after the property reviews them.</p>}
      </section>

      {currentStay ? <section className="surface-card p-5 sm:p-6" aria-labelledby="deposit-heading"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><p className="text-sm font-semibold text-[#176e61]">SECURITY DEPOSIT</p><h2 className="mt-1 text-xl font-semibold" id="deposit-heading">Deposit activity</h2></div><strong>{formatCurrency(currentStay.securityDeposit?.balancePaise ?? BigInt(0))} balance</strong></div>{currentStay.securityDeposit?.transactions.length ? <ul className="mt-4 divide-y divide-slate-100">{currentStay.securityDeposit.transactions.map((transaction) => <li className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={transaction.id}><span>{transaction.description ?? transaction.type.replaceAll("_", " ")}{transaction.paymentDate ? ` · ${formatDate(transaction.paymentDate)}` : ""}</span><strong className={transaction.amountPaise < BigInt(0) ? "text-slate-600" : "text-[#256b4c]"}>{transaction.amountPaise < BigInt(0) ? "−" : "+"}{formatCurrency(transaction.amountPaise < BigInt(0) ? -transaction.amountPaise : transaction.amountPaise)}</strong></li>)}</ul> : <p className="muted mt-4 text-sm">No deposit activity has been recorded for this stay.</p>}</section> : null}
    </section>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-lg bg-[#f5f7f5] p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

type OverviewCardTone = "amber" | "green" | "neutral";

function OverviewCard({
  label,
  value,
  detail,
  href,
  tone,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: OverviewCardTone;
}>) {
  const toneClasses: Record<OverviewCardTone, string> = {
    amber: "border-amber-200 bg-amber-50",
    green: "border-emerald-200 bg-emerald-50",
    neutral: "border-slate-200 bg-white",
  };

  return (
    <a
      href={href}
      className={`block rounded-xl border p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176e61] ${toneClasses[tone]}`}
    >
      <p className="text-sm font-medium text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {detail}
      </p>
    </a>
  );
}
