import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "@/modules/resident/application";
import { assignResidentBedAction, checkOutResidentAction, recordMoveOutNoticeAction, recordSecurityDepositReceiptAction, setResidentRentTermsAction, updateResidentEmailAction } from "@/modules/resident/ui/actions";
import { RentTermsFields } from "@/modules/billing/ui/rent-terms-fields";
import { SecurityDepositTermsFields } from "@/modules/billing/ui/security-deposit-terms-fields";
import { ResidentInvitationCard } from "@/modules/auth/ui/resident-invitation-card";
import { residentDocumentUseCases } from "@/modules/resident-document/application";
import { ResidentKycReview } from "@/modules/resident-document/ui/resident-kyc-review";

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysInput(value: string, days: number) {
  const result = new Date(`${value}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function errorMessage(code?: string) {
  switch (code) {
    case "invalid": return "Check the selected bed and date, then try again.";
    case "bed-taken": return "That bed is no longer available. Select another available bed.";
    case "future-date": return "Move-in and move-out dates cannot be in the future.";
    case "date-order": return "Move-out cannot be earlier than the move-in date.";
    case "already-active": return "This resident already has an active bed assignment.";
    case "has-reservation": return "This resident has an active reservation. Confirm its move-in from Reservations first.";
    case "deposit-limit": return "That receipt exceeds the remaining required security deposit.";
    case "checkout-drafts": return "Finalize or void draft invoices before closing this stay.";
    case "checkout-balance": return "Recalculate the amount due after the selected rent policy, exit charge, and deposit credit, then try again.";
    case "checkout-deposit-account": return "This stay has prepaid rent to credit but no open deposit ledger. Reconcile the deposit ledger before completing checkout.";
    case "checkout-deduction": return "The damage deduction cannot exceed the deposit remaining after invoice dues are settled.";
    case "stay-ended": return "That stay has already ended or is no longer available.";
    case "email-taken": return "Another resident in this organization already uses that email address.";
    case "notice-short": return "The requested move-out date does not allow the property’s full notice period.";
    case "lock-in-active": return "The requested date is within the lock-in period. An owner or manager must provide an override reason.";
    case "notice-required": return "Record a move-out notice before completing checkout.";
    case "before-scheduled-date": return "The actual move-out date cannot be earlier than the date accepted in the notice.";
    case "notice-exists": return "A move-out notice is already recorded for this stay.";
    default: return null;
  }
}

export default async function ResidentDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string; residentId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId, residentId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  let resident;
  let availableBeds;
  let documents;
  try {
    [resident, availableBeds, documents] = await Promise.all([
      residentUseCases.getResident(actor, residentId),
      residentUseCases.listAvailableBeds(actor),
      residentDocumentUseCases.listForStaff(actor, residentId),
    ]);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  if (!resident) notFound();

  const today = todayInTimezone(actor.organizationTimezone);
  const currentStay = resident.currentReservation ? null : resident.stays.find((stay) => ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"].includes(stay.status) && stay.startDate.toISOString().slice(0, 10) <= today && (!stay.endDate || stay.endDate.toISOString().slice(0, 10) >= today)) ?? null;
  const availableDeposit = currentStay?.securityDeposit?.balancePaise && currentStay.securityDeposit.balancePaise > BigInt(0) ? currentStay.securityDeposit.balancePaise : BigInt(0);
  const checkoutPaymentDue = currentStay ? (currentStay.finalizedInvoiceDuePaise > availableDeposit ? currentStay.finalizedInvoiceDuePaise - availableDeposit : BigInt(0)) : BigInt(0);
  const requestedCheckoutDate = currentStay?.checkoutNotice?.requestedCheckoutDate?.toISOString().slice(0, 10) ?? null;
  const checkoutDateReached = Boolean(requestedCheckoutDate && today >= requestedCheckoutDate);
  const minimumNoticeDate = currentStay ? addDaysInput(today, currentStay.noticePeriodDays) : today;
  const message = errorMessage(query.error);

  return (
    <section className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb] hover:underline" href={`/org/${orgId}/residents`}>
        <span aria-hidden="true">←</span> Residents
      </Link>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}

      {resident.stays.length ? <form action={updateResidentEmailAction} className="surface-card grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input name="orgId" type="hidden" value={orgId} /><input name="residentId" type="hidden" value={resident.id} />
        <label className="block space-y-2 text-sm font-medium" htmlFor="residentEmail"><span>Email for portal access</span><input className={inputClass} defaultValue={resident.email ?? ""} id="residentEmail" name="email" required type="email" /></label>
        <button className="min-h-11 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white" type="submit">Save email</button>
      </form> : null}

      <header className="surface-card flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-start sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ef] text-[#2563eb]"><WorkspaceIcon name="person" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2563eb]">RESIDENT PROFILE</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{resident.name}</h1>
            <p className="muted mt-2 text-sm">{resident.phone}{resident.email ? ` · ${resident.email}` : ""}</p>
          </div>
        </div>
        {currentStay ? <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${currentStay.status === "ACTIVE" ? "bg-[#eaf5ef] text-[#256b4c]" : "bg-[#fff4df] text-[#8a5a00]"}`}>{currentStay.status === "ACTIVE" ? "Currently staying" : "Notice period"}</span> : resident.currentReservation ? <span className="w-fit rounded-full bg-[#fff4df] px-3 py-1.5 text-sm font-semibold text-[#8a5a00]">Reserved · move-in pending</span> : <span className="w-fit rounded-full bg-[#f1f3f2] px-3 py-1.5 text-sm font-semibold text-[#53647e]">Checked out</span>}
      </header>

      {currentStay ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2563eb]">CURRENT BED ASSIGNMENT</p>
                <h2 className="mt-2 text-xl font-semibold">{currentStay.propertyName}</h2>
                <p className="muted mt-1 text-sm">{currentStay.floorName} · Room {currentStay.roomNumber}</p>
              </div>
              <span className="rounded-lg bg-[#eaf4ef] px-4 py-2 text-sm font-semibold text-[#2563eb]">{currentStay.bedLabel}</span>
            </div>
            <div className="mt-6 grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
              <Detail label="Move-in date" value={formatDate(currentStay.startDate)} />
              <Detail label="Stay status" value={currentStay.status === "ACTIVE" ? "Active" : currentStay.status.replaceAll("_", " ").toLowerCase()} />
              <Detail label="Move-out notice" value={`${currentStay.noticePeriodDays} days`} />
              <Detail label="Lock-in period" value={currentStay.lockInMonths ? `${currentStay.lockInMonths} months${currentStay.lockInEndDate ? ` · through ${formatDate(currentStay.lockInEndDate)}` : ""}` : "None"} />
              <Detail label="Monthly rent" value={currentStay.rent ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(currentStay.rent.amountPaise) / 100) : "Rent terms not set"} />
              <Detail label="Billing cycle" value={currentStay.rent ? (currentStay.rent.billingCycleType === "MOVE_IN_DAY" ? "Move-in day each month" : `Day ${currentStay.rent.billingDay} each month`) : "Required for invoices"} />
            </div>
            <details className="mt-5 border-t border-[#e2e8f0] pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#2563eb]">{currentStay.rent ? "Update rent terms" : "Add rent terms"}</summary>
              <p className="muted mt-2 text-sm">Changes take effect today and keep earlier rent rates in the stay history.</p>
              <form action={setResidentRentTermsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
                <input name="orgId" type="hidden" value={orgId} />
                <input name="residentId" type="hidden" value={resident.id} />
                <input name="stayId" type="hidden" value={currentStay.id} />
                <RentTermsFields />
                <div className="sm:col-span-2"><button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Save rent terms</button></div>
              </form>
            </details>
            {currentStay.securityDeposit ? <div className="mt-5 border-t border-[#e2e8f0] pt-5">
              <h3 className="font-semibold">Security deposit</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Detail label="Required" value={formatCurrency(currentStay.securityDeposit.requiredAmountPaise)} />
                <Detail label="Received" value={formatCurrency(currentStay.securityDeposit.balancePaise)} />
                <Detail label="Outstanding" value={formatCurrency(currentStay.securityDeposit.requiredAmountPaise > currentStay.securityDeposit.balancePaise ? currentStay.securityDeposit.requiredAmountPaise - currentStay.securityDeposit.balancePaise : BigInt(0))} />
              </div>
              {currentStay.securityDeposit.transactions.length ? <ul className="mt-3 space-y-1 text-sm text-slate-600">{currentStay.securityDeposit.transactions.map((transaction) => <li key={transaction.id}>{transaction.type.replaceAll("_", " ")} · {formatCurrency(transaction.amountPaise)}{transaction.paymentDate ? ` · ${formatDate(transaction.paymentDate)}` : ""}</li>)}</ul> : <p className="muted mt-2 text-sm">No deposit payment has been recorded.</p>}
              {currentStay.securityDeposit.requiredAmountPaise > currentStay.securityDeposit.balancePaise ? <form action={recordSecurityDepositReceiptAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input name="orgId" type="hidden" value={orgId} /><input name="residentId" type="hidden" value={resident.id} /><input name="stayId" type="hidden" value={currentStay.id} />
                <label className="block space-y-2 text-sm font-medium" htmlFor="depositAmount"><span>Receive security deposit (₹)</span><input className={inputClass} id="depositAmount" name="amount" inputMode="decimal" placeholder="0.00" required /></label>
                <label className="block space-y-2 text-sm font-medium" htmlFor="depositDate"><span>Payment date</span><input className={inputClass} id="depositDate" name="paymentDate" type="date" defaultValue={today} required /></label>
                <label className="block space-y-2 text-sm font-medium" htmlFor="depositMethod"><span>Method</span><select className={inputClass} id="depositMethod" name="method" defaultValue="UPI"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
                <label className="block space-y-2 text-sm font-medium" htmlFor="depositReference"><span>Reference (optional)</span><input className={inputClass} id="depositReference" name="reference" /></label>
                <button className="min-h-10 rounded-lg bg-[#2563eb] px-3 text-sm font-semibold text-white sm:col-span-2 sm:justify-self-start" type="submit">Record deposit receipt</button>
              </form> : null}
            </div> : null}
          </div>
          <section className="surface-card p-5 sm:p-6" aria-labelledby="checkout-heading">
            {currentStay.status === "ACTIVE" ? <>
              <p className="text-sm font-semibold text-[#2563eb]">MOVE-OUT PROCESS</p>
              <h2 className="mt-1 text-lg font-semibold" id="checkout-heading">Record move-out notice</h2>
              <p className="muted mt-2 text-sm leading-6">The resident remains assigned to this bed during the notice period. Checkout can be completed on or after the requested date.</p>
              <p className="mt-3 rounded-lg bg-[#f5f7fb] p-3 text-sm">Required notice: <strong>{currentStay.noticePeriodDays} days</strong>. Lock-in ends {currentStay.lockInEndDate ? <strong>{formatDate(currentStay.lockInEndDate)}</strong> : <strong>not applicable</strong>}. An early lock-in exit needs an owner or manager override reason.</p>
              <form action={recordMoveOutNoticeAction} className="mt-5 space-y-4">
                <input name="orgId" type="hidden" value={orgId} /><input name="residentId" type="hidden" value={resident.id} /><input name="stayId" type="hidden" value={currentStay.id} />
                <label className="block space-y-2 text-sm font-medium" htmlFor="requestedCheckoutDate"><span>Requested move-out date</span><input className={inputClass} id="requestedCheckoutDate" min={minimumNoticeDate} name="requestedCheckoutDate" required type="date" /></label>
                <label className="block space-y-2 text-sm font-medium" htmlFor="lockInOverrideReason"><span>Lock-in override reason (required for an early exit)</span><textarea className={inputClass} id="lockInOverrideReason" maxLength={500} name="lockInOverrideReason" placeholder="Explain why an exception is approved" rows={3}/></label>
                <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Record notice</button>
              </form>
            </> : <>
              <p className="text-sm font-semibold text-[#2563eb]">NOTICE PERIOD</p>
              <h2 className="mt-1 text-lg font-semibold" id="checkout-heading">Move-out notice recorded</h2>
              {currentStay.checkoutNotice ? <div className="mt-3 rounded-lg bg-[#f5f7fb] p-3 text-sm"><p>Notice date: <strong>{currentStay.checkoutNotice.noticeDate ? formatDate(currentStay.checkoutNotice.noticeDate) : "—"}</strong></p><p className="mt-1">Requested move-out: <strong>{currentStay.checkoutNotice.requestedCheckoutDate ? formatDate(currentStay.checkoutNotice.requestedCheckoutDate) : "—"}</strong></p>{currentStay.checkoutNotice.lockInOverride ? <p className="mt-1">Lock-in exception: {currentStay.checkoutNotice.lockInOverrideReason}</p> : null}</div> : null}
              {checkoutDateReached ? <>
                <p className="muted mt-3 text-sm leading-6">Complete settlement to close this stay and release the bed.</p>
                <div className="mt-3 rounded-lg bg-[#f5f7fb] p-3 text-sm"><p>Finalized invoice due: <strong>{formatCurrency(currentStay.finalizedInvoiceDuePaise)}</strong></p><p className="mt-1">Deposit available: <strong>{formatCurrency(availableDeposit)}</strong></p>{currentStay.draftInvoiceCount ? <p className="mt-2 font-medium text-amber-800">{currentStay.draftInvoiceCount} draft invoice(s) must be finalized or voided before checkout.</p> : null}</div>
                <form action={checkOutResidentAction} className="mt-5 space-y-4">
                  <input name="orgId" type="hidden" value={orgId} /><input name="residentId" type="hidden" value={resident.id} /><input name="stayId" type="hidden" value={currentStay.id} />
                  <label className="block space-y-2 text-sm font-medium" htmlFor="endDate"><span>Actual move-out date</span><input className={inputClass} defaultValue={today} min={requestedCheckoutDate ?? today} max={today} id="endDate" name="endDate" required type="date" /></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="rentExitPolicy"><span>Final rent policy</span><select className={inputClass} id="rentExitPolicy" name="rentExitPolicy" defaultValue="PRORATED" required><option value="PRORATED">Charge through move-out date (calendar-day proration)</option><option value="FULL_CYCLE">Charge the full billing cycle</option></select></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="checkoutPaymentDate"><span>Settlement date</span><input className={inputClass} id="checkoutPaymentDate" name="paymentDate" type="date" defaultValue={today} max={today} required /></label>
                  <p className="muted text-xs leading-5">Draft invoices must be finalized or voided first. Any invoice balance not covered by the deposit must be paid here.</p>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="additionalPayment"><span>Additional payment required after deposit (₹)</span><input className={inputClass} id="additionalPayment" name="additionalPayment" inputMode="decimal" defaultValue={formatPaiseInput(checkoutPaymentDue)} /><span className="muted text-xs">Recalculate after selecting the rent policy and any exit charge. Prepaid rent credit is included in the checkout clear-out.</span></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="additionalPaymentMethod"><span>Additional payment method</span><select className={inputClass} id="additionalPaymentMethod" name="additionalPaymentMethod" defaultValue="CASH"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="earlyExitCharge"><span>Mid-month exit charge (₹, optional)</span><input className={inputClass} id="earlyExitCharge" name="earlyExitCharge" inputMode="decimal" placeholder="0.00" /><span className="muted text-xs">Any charge taken from the resident must have a reason.</span></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="earlyExitChargeReason"><span>Exit charge reason</span><input className={inputClass} id="earlyExitChargeReason" name="earlyExitChargeReason" maxLength={500} placeholder="Required when an exit charge is entered" /></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="damageDeduction"><span>Damage deduction from deposit (₹, optional)</span><input className={inputClass} id="damageDeduction" name="damageDeduction" inputMode="decimal" placeholder="0.00" /></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="damageReason"><span>Deduction reason</span><input className={inputClass} id="damageReason" name="damageReason" maxLength={500} placeholder="Required when deducting" /></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="depositRefundMethod"><span>Deposit refund method</span><select className={inputClass} id="depositRefundMethod" name="depositRefundMethod" defaultValue="UPI"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
                  <label className="block space-y-2 text-sm font-medium" htmlFor="checkoutReference"><span>Payment reference (optional)</span><input className={inputClass} id="checkoutReference" name="reference" maxLength={100} /></label>
                  <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#d5b9ac] bg-white px-4 py-2.5 text-sm font-semibold text-[#85482f] hover:bg-[#fff8f5]" type="submit">Settle and check out resident</button>
                </form>
              </> : <p className="muted mt-4 text-sm">The bed remains occupied through the notice period. Checkout settlement becomes available on or after the requested move-out date.</p>}
            </>}
          </section>
        </section>
      ) : resident.currentReservation ? (
        <section className="surface-card p-5 sm:p-6" aria-labelledby="reservation-heading">
          <p className="text-sm font-semibold text-[#8a5a00]">ACTIVE RESERVATION</p>
          <h2 className="mt-1 text-xl font-semibold" id="reservation-heading">Move-in has not started</h2>
          <p className="muted mt-2 max-w-2xl text-sm leading-6">{resident.currentReservation.propertyName} · Room {resident.currentReservation.roomNumber} · {resident.currentReservation.bedLabel}. The resident stays reserved until move-in is confirmed.</p>
          {resident.currentReservation.prepaidSecurityDepositPaise > BigInt(0) ? <p className="mt-3 text-sm font-medium">Security deposit received: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(resident.currentReservation.prepaidSecurityDepositPaise) / 100)}</p> : null}
          <Link className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white" href={`/org/${orgId}/reservations`}>Open reservations to confirm move-in</Link>
        </section>
      ) : (
        <section className="surface-card p-5 sm:p-6" aria-labelledby="assign-heading">
          <p className="text-sm font-semibold text-[#2563eb]">NEW STAY</p>
          <h2 className="mt-1 text-xl font-semibold" id="assign-heading">Assign an available bed</h2>
          <p className="muted mt-2 max-w-2xl text-sm leading-6">This resident has no active bed assignment. Select an available bed to start a new stay; previous stays remain in the history below.</p>
          {availableBeds.length ? (
            <form action={assignResidentBedAction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input name="orgId" type="hidden" value={orgId} />
              <input name="residentId" type="hidden" value={resident.id} />
              <label className="block space-y-2 text-sm font-medium" htmlFor="bedId">
                <span>Available bed</span>
                <select className={inputClass} id="bedId" name="bedId" required defaultValue="">
                  <option disabled value="">Choose a property, room, and bed</option>
                  {availableBeds.map((bed) => <option key={bed.id} value={bed.id}>{bed.propertyName} · {bed.floorName} · Room {bed.roomNumber} · {bed.label}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium" htmlFor="startDate">
                <span>Move-in date</span>
                <input className={inputClass} defaultValue={today} id="startDate" max={today} name="startDate" required type="date" />
              </label>
              <RentTermsFields />
              <SecurityDepositTermsFields />
              <div className="sm:col-span-2">
                <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Assign bed and start stay</button>
              </div>
            </form>
          ) : (
            <p className="mt-5 rounded-lg bg-[#f5f7fb] p-4 text-sm text-[#53647e]">There are no available beds in the properties you can access. Add or free a bed before starting another stay.</p>
          )}
        </section>
      )}

      {resident.stays.length ? resident.email
        ? <ResidentInvitationCard organizationId={orgId} residentId={resident.id} email={resident.email} />
        : <section className="surface-card p-5 sm:p-6"><p className="text-sm font-semibold text-[#2563eb]">RESIDENT ACCESS</p><h2 className="mt-1 text-lg font-semibold">Add an email to enable portal access</h2><p className="muted mt-2 text-sm">This resident profile has no email address, so StayPilot cannot send an activation invitation.</p></section>
        : null}

      <section className="surface-card overflow-hidden" aria-labelledby="stay-history-heading">
        <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6">
          <h2 className="font-semibold" id="stay-history-heading">Stay history</h2>
          <p className="muted mt-1 text-sm">Recorded bed assignments for this resident</p>
        </header>
        {resident.stays.length ? (
          <div className="divide-y divide-[#e2e8f0]">
            {resident.stays.map((stay) => (
              <article className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={stay.id}>
                <div>
                  <h3 className="font-semibold">{stay.propertyName} · Room {stay.roomNumber} · {stay.bedLabel}</h3>
                  <p className="muted mt-1 text-sm">{stay.floorName} · {formatDate(stay.startDate)}{stay.endDate ? ` to ${formatDate(stay.endDate)}` : " to present"}</p>
                  {stay.securityDeposit ? <p className="muted mt-1 text-sm">Deposit ledger balance: {formatCurrency(stay.securityDeposit.balancePaise)} · {stay.securityDeposit.status.toLowerCase()}</p> : null}
                  {stay.securityDeposit?.transactions.length ? <p className="muted mt-1 text-xs">{stay.securityDeposit.transactions.map((transaction) => `${transaction.type.replaceAll("_", " ")} ${formatCurrency(transaction.amountPaise)}`).join(" · ")}</p> : null}
                </div>
                <span className={stay.status === "ACTIVE" ? "w-fit rounded-full bg-[#eaf5ef] px-2.5 py-1 text-xs font-semibold text-[#256b4c]" : "w-fit rounded-full bg-[#f1f3f2] px-2.5 py-1 text-xs font-semibold text-[#53647e]"}>{stay.status === "ACTIVE" ? "Active" : "Ended"}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted px-5 py-8 text-sm sm:px-6">No stay history is visible in your assigned properties.</p>
        )}
      </section>
      <ResidentKycReview organizationId={orgId} residentId={residentId} documents={documents} />
    </section>
  );
}

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><p className="muted text-xs">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function formatCurrency(amountPaise: bigint) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(amountPaise) / 100); }
function formatPaiseInput(amountPaise: bigint) { return `${amountPaise / BigInt(100)}.${(amountPaise % BigInt(100)).toString().padStart(2, "0")}`; }
