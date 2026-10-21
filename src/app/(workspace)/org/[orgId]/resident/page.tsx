import { notFound, redirect } from "next/navigation";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { ResidentComplaints } from "@/modules/complaint/ui/resident-complaints";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { ResidentFoodAvailability, ResidentFoodMenu, ResidentFoodPolls } from "@/modules/food/ui/resident-food-polls";
import { noticeUseCases } from "@/modules/notice/application/use-cases";
import { ResidentNoticeBoard } from "@/modules/notice/ui/resident-notice-board";
import { residentDocumentUseCases } from "@/modules/resident-document/application";
import { ResidentDocuments } from "@/modules/resident-document/ui/resident-documents";
import { residentUseCases } from "@/modules/resident/application";
import { submitResidentMoveOutNoticeAction, updateResidentSelfProfileAction } from "@/modules/resident/ui/actions";
import { ResidentMobileNav } from "@/components/workspace/resident-mobile-nav";
import styles from "./resident-dashboard.module.css";

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
  searchParams: Promise<{ error?: string; profile?: string; "profile-error"?: string; "complaint-error"?: string; "complaint-created"?: string; "food-error"?: string; "food-voted"?: string; "food-availability"?: string; "food-availability-error"?: string }>;
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
  if (!resident) return <section className={`${styles.dashboard} ${styles.unlinked}`}>
    <p className={styles.eyebrow}>Resident portal</p>
    <h1>Your account is not linked yet</h1>
    <p>This account has no current stay in an active PG. If your PG was deactivated, contact your organization owner or platform developer. Otherwise, ask your property manager to send a resident activation invitation to this email.</p>
    <div className={styles.unlinkedEmail}><strong>SIGNED-IN EMAIL</strong><span>{actor.userEmail}</span></div>
  </section>;

  const today = localToday(actor.organizationTimezone);
  const currentStay = resident.stays.find((stay) => ["ACTIVE", "NOTICE_PERIOD", "CHECKOUT_PROCESSING"].includes(stay.status) && stay.startDate.toISOString().slice(0, 10) <= today && (!stay.endDate || stay.endDate.toISOString().slice(0, 10) >= today)) ?? null;
  const minimumDateByNotice = currentStay ? addDays(today, currentStay.noticePeriodDays) : today;
  const lockInDate = currentStay?.lockInEndDate?.toISOString().slice(0, 10);
  const minimumMoveOutDate = lockInDate && lockInDate > minimumDateByNotice ? lockInDate : minimumDateByNotice;
  const invoices = resident.stays.flatMap((stay) => stay.invoices.map((invoice) => ({ ...invoice, stayProperty: stay.propertyName })))
    .filter((invoice) => ["FINALIZED", "PARTIALLY_PAID", "PAID"].includes(invoice.status))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const [complaints, foodPolls, foodMenus, foodAvailability, notices, documents] = await Promise.all([complaintUseCases.listForResident(actor), foodUseCases.listForResident(actor), foodUseCases.listMenusForResident(actor), foodUseCases.listAvailabilityForResident(actor), noticeUseCases.listForResident(actor), residentDocumentUseCases.listForResident(actor)]);
  const invoiceBalance = (invoice: typeof invoices[number]) => {
    const balance = invoice.totalPaise + invoice.adjustmentPaise - invoice.amountPaidPaise;
    return balance > BigInt(0) ? balance : BigInt(0);
  };
  const outstandingInvoices = invoices.filter((invoice) => invoiceBalance(invoice) > BigInt(0));
  const nextDueInvoice = outstandingInvoices[0] ?? null;
  const recentPayments = invoices.flatMap((invoice) => invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.invoiceNumber, stayProperty: invoice.stayProperty })))
    .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()).slice(0, 4);
  const deposit = currentStay?.securityDeposit ?? null;
  const error = errorMessage(query.error);
  const daysUntilDue = nextDueInvoice ? Math.ceil((new Date(`${nextDueInvoice.dueDate.toISOString().slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000) : null;
  const dueMessage = daysUntilDue !== null && daysUntilDue < 0 ? `Payment was due ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "day" : "days"} ago` : daysUntilDue === 0 ? "Payment is due today" : `Payment is due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`;

  return <section className={styles.dashboard} id="top">
    <header className={styles.welcome}>
      <div><p className={styles.eyebrow}>Resident dashboard</p><h1>Good morning, {resident.name}</h1><p>Your stay, bills, meals and support in one place.</p></div>
      <span className={styles.residentBadge}><WorkspaceIcon name="verified_user" />Active Resident</span>
    </header>

    {query.profile === "saved" ? <p className={styles.profileMessage} role="status">Your profile details have been updated.</p> : null}
    {query["profile-error"] ? <p className={styles.profileError} role="alert">Enter a name of at least 2 characters and a valid phone number.</p> : null}

    {error ? <p className={styles.notice} role="alert">{error}</p> : null}
    {nextDueInvoice ? <aside className={styles.dueBanner}>
      <div className={styles.dueCopy}><span className={styles.dueIcon}><WorkspaceIcon name="event_available" /></span><div><strong>{dueMessage}</strong><p>{nextDueInvoice.invoiceNumber} · {nextDueInvoice.stayProperty} · {formatCurrency(invoiceBalance(nextDueInvoice))} outstanding</p></div></div>
      <a className={styles.buttonPrimary} href="#invoices-heading">Review bill <WorkspaceIcon name="chevron_right" /></a>
    </aside> : null}

    {currentStay ? <section className={`${styles.card} ${styles.stayCard}`} aria-labelledby="stay-heading" id="stay-heading">
      <div className={styles.stayTop}><div className={styles.stayIdentity}><span className={styles.stayIcon}><WorkspaceIcon name="domain" /></span><div><p className={styles.eyebrow}>Your current stay</p><h2>{currentStay.propertyName}</h2><p>{currentStay.floorName} · Room {currentStay.roomNumber} · Bed {currentStay.bedLabel}</p></div></div><span className={`${styles.statusPill} ${currentStay.status !== "ACTIVE" ? styles.statusNotice : ""}`}>{currentStay.status === "NOTICE_PERIOD" ? "Notice submitted" : currentStay.status === "CHECKOUT_PROCESSING" ? "Checkout in progress" : "Active"}</span></div>
      <div className={styles.stayDetails}><div className={styles.detailCell}><span>Move-in date</span><strong>{formatDate(currentStay.startDate)}</strong></div><div className={styles.detailCell}><span>Monthly rent</span><strong>{currentStay.rent ? formatCurrency(currentStay.rent.amountPaise) : "Not set"}</strong></div><div className={styles.detailCell}><span>Deposit balance</span><strong>{formatCurrency(currentStay.securityDeposit?.balancePaise ?? BigInt(0))}</strong></div></div>
      {currentStay.checkoutNotice ? <p className={styles.moveOutStatus}>Move-out requested for <strong>{currentStay.checkoutNotice.requestedCheckoutDate ? formatDate(currentStay.checkoutNotice.requestedCheckoutDate) : "date pending"}</strong>. Contact your property manager if your plans change.</p> : currentStay.status === "ACTIVE" || currentStay.status === "NOTICE_PERIOD" ? <details className={styles.moveOut}><summary>Move-out notice</summary><p>Your property requires {currentStay.noticePeriodDays} days’ notice. The earliest date also respects your lock-in terms.</p><form action={submitResidentMoveOutNoticeAction} className={styles.moveOutForm}><input name="orgId" type="hidden" value={orgId} /><input name="stayId" type="hidden" value={currentStay.id} /><label htmlFor="requestedCheckoutDate">Requested move-out date<input id="requestedCheckoutDate" min={minimumMoveOutDate} name="requestedCheckoutDate" required type="date" /></label><button className={styles.buttonPrimary} type="submit">Submit notice</button></form></details> : null}
    </section> : resident.currentReservation ? <section className={`${styles.card} ${styles.stayCard}`} id="stay-heading"><p className={styles.eyebrow}>Upcoming stay</p><h2>{resident.currentReservation.propertyName}</h2><p>Room {resident.currentReservation.roomNumber} · Bed {resident.currentReservation.bedLabel}</p><p>Move-in window: {formatDate(resident.currentReservation.startDate)} – {formatDate(resident.currentReservation.endDate)}</p></section> : <section className={`${styles.card} ${styles.stayCard}`} id="stay-heading"><p className={styles.eyebrow}>Your stay</p><h2>No current stay</h2><p>Your previous stays and bills remain available below.</p></section>}

    <details className={`${styles.card} ${styles.profileEditor}`}>
      <summary>Update your profile details</summary>
      <p>Keep your name and phone number up to date for property communications. Login email and verification details can’t be changed here.</p>
      <form action={updateResidentSelfProfileAction}>
        <input name="orgId" type="hidden" value={orgId} />
        <label htmlFor="resident-profile-name">Full name<input autoComplete="name" defaultValue={resident.name} id="resident-profile-name" maxLength={180} minLength={2} name="name" required /></label>
        <label htmlFor="resident-profile-phone">Phone number<input autoComplete="tel" defaultValue={resident.phone} id="resident-profile-phone" maxLength={30} minLength={8} name="phone" required type="tel" /></label>
        <button className={styles.buttonPrimary} type="submit">Save profile</button>
      </form>
    </details>

    <div className={styles.dashboardColumns}>
      <div className={styles.mainColumn}>
        <section className={styles.statement} aria-label="Current bill">
          {nextDueInvoice ? <><div className={styles.statementTop}><div className={styles.statementTitle}><WorkspaceIcon name="receipt_long" /><div><h2>Current cycle statement</h2><p>{nextDueInvoice.invoiceNumber} · Due {formatDate(nextDueInvoice.dueDate)}</p></div></div></div><div className={styles.statementTotal}><span>Amount due</span><strong>{formatCurrency(invoiceBalance(nextDueInvoice))}</strong></div><div className={styles.statementItems}>{nextDueInvoice.items.map((item, index) => <div className={styles.statementItem} key={`${nextDueInvoice.id}-${index}`}><span>{item.description}{item.quantity !== 1 ? ` × ${item.quantity}` : ""}</span><strong>{formatCurrency(item.lineTotalPaise)}</strong></div>)}</div><div className={styles.statementFooter}><p><WorkspaceIcon name="lock" />Secure payment is managed by your property team.</p><a className={styles.buttonLight} href="#invoices-heading">Review bill <WorkspaceIcon name="chevron_right" /></a></div></> : <div className={styles.statementPaid}><WorkspaceIcon name="verified_user" /><h2>You’re all caught up</h2><p>Finalized bills will appear here when they’re ready.</p></div>}
        </section>

        <section className={styles.section} aria-labelledby="invoices-heading" id="invoices-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Billing</p><h2>Invoices and receipts</h2></div></div>
          {invoices.length ? <div className={styles.invoiceList}>{invoices.map((invoice) => {
            const effectiveTotal = invoice.totalPaise + invoice.adjustmentPaise;
            const balance = invoiceBalance(invoice);
            return <article className={`${styles.card} ${styles.invoiceCard}`} key={invoice.id}><div className={styles.invoiceTop}><div><h3>{invoice.invoiceNumber}</h3><p>{invoice.invoiceType === "ELECTRICITY" ? "Electricity" : "Rent"} · {invoice.stayProperty} · Due {formatDate(invoice.dueDate)}</p><p>Billing period: {formatDate(invoice.billingPeriodStart)} – {formatDate(invoice.billingPeriodEnd)}</p></div><span className={`${styles.invoiceStatus} ${balance === BigInt(0) ? styles.invoicePaid : styles.invoiceDue}`}>{balance === BigInt(0) ? "Paid" : invoice.amountPaidPaise > BigInt(0) ? "Partially paid" : "Due"}</span></div><div className={styles.invoiceItems}>{invoice.items.map((item, index) => <div className={styles.invoiceItem} key={`${invoice.id}-${index}`}><span>{item.description}{item.quantity !== 1 ? ` × ${item.quantity}` : ""}</span><strong>{formatCurrency(item.lineTotalPaise)}</strong></div>)}</div><div className={styles.invoiceTotal}><span>Total {formatCurrency(effectiveTotal)}{invoice.adjustmentPaise !== BigInt(0) ? ` (checkout adjustment ${invoice.adjustmentPaise > BigInt(0) ? "+" : "−"}${formatCurrency(invoice.adjustmentPaise > BigInt(0) ? invoice.adjustmentPaise : -invoice.adjustmentPaise)})` : ""} · Paid {formatCurrency(invoice.amountPaidPaise)}</span><strong>Balance {formatCurrency(balance)}</strong></div>{invoice.payments.length ? <details className={styles.paymentDetails}><summary>Payment activity ({invoice.payments.length})</summary><ul>{invoice.payments.map((payment, index) => <li key={`${invoice.id}-payment-${index}`}><span>{payment.transactionType === "REVERSAL" ? "Reversal" : "Payment"} · {formatDate(payment.paymentDate)} · {payment.method.replaceAll("_", " ")}{payment.reference ? ` · Ref ${payment.reference}` : ""}{payment.transactionType === "REVERSAL" && payment.notes ? ` · Reason: ${payment.notes}` : ""}</span><strong>{formatCurrency(payment.amountPaise)}</strong></li>)}</ul></details> : null}</article>;
          })}</div> : <p className={`${styles.card} ${styles.emptyState}`}>No finalized invoices yet. Draft bills will appear after the property reviews them.</p>}
        </section>
      </div>

      <aside className={styles.sideColumn}>
        <section className={`${styles.card} ${styles.shortcuts}`}><div className={styles.shortcutsHead}><h2>Quick links</h2><span>Resident services</span></div><div className={styles.shortcutGrid}><a className={styles.shortcut} href="#invoices-heading"><span className={styles.shortcutIcon}><WorkspaceIcon name="receipt_long" /></span><span><strong>View bills</strong><small>Invoices and payments</small></span></a><a className={styles.shortcut} href="#invoices-heading"><span className={styles.shortcutIcon}><WorkspaceIcon name="account_balance" /></span><span><strong>Payment history</strong><small>Recorded transactions</small></span></a><a className={styles.shortcut} href="#food-heading"><span className={styles.shortcutIcon}><WorkspaceIcon name="restaurant" /></span><span><strong>Vote food</strong><small>Choose upcoming meals</small></span></a><a className={styles.shortcut} href="#support-heading"><span className={styles.shortcutIcon}><WorkspaceIcon name="support_agent" /></span><span><strong>Help desk</strong><small>Requests and updates</small></span></a></div></section>

        <section className={`${styles.card} ${styles.activityCard}`}><div className={styles.activityHeading}><WorkspaceIcon name="history" /><h2>Recent payment activity</h2></div>{recentPayments.length ? <ul className={styles.activityList}>{recentPayments.map((payment, index) => <li key={`${payment.invoiceNumber}-${index}`}><div><strong>{payment.transactionType === "REVERSAL" ? "Payment reversal" : payment.invoiceNumber}</strong><small>{payment.stayProperty} · {formatDate(payment.paymentDate)} · {payment.method.replaceAll("_", " ")}</small></div><span className={`${styles.activityAmount} ${payment.transactionType === "REVERSAL" ? styles.negative : ""}`}>{payment.transactionType === "REVERSAL" ? "−" : "+"}{formatCurrency(payment.amountPaise)}</span></li>)}</ul> : <p className={styles.emptyState}>Payment records will appear here once recorded by your property team.</p>}</section>

        {currentStay ? <section className={`${styles.card} ${styles.depositCard}`} id="deposit-heading"><div className={styles.depositHeading}><WorkspaceIcon name="verified_user" /><h2>Security deposit</h2></div><p className={styles.depositBalance}>{formatCurrency(deposit?.balancePaise ?? BigInt(0))}</p><p className={styles.depositCaption}>Current stay balance</p>{deposit?.transactions.length ? <ul className={styles.depositList}>{deposit.transactions.slice(0, 3).map((transaction) => <li key={transaction.id}><div><strong>{transaction.description ?? transaction.type.replaceAll("_", " ")}</strong><small>{transaction.paymentDate ? formatDate(transaction.paymentDate) : formatDate(transaction.createdAt)}</small></div><span className={`${styles.activityAmount} ${transaction.amountPaise < BigInt(0) ? styles.negative : ""}`}>{transaction.amountPaise < BigInt(0) ? "−" : "+"}{formatCurrency(transaction.amountPaise < BigInt(0) ? -transaction.amountPaise : transaction.amountPaise)}</span></li>)}</ul> : <p className={styles.depositCaption}>No deposit activity has been recorded for this stay.</p>}</section> : null}
      </aside>
    </div>

    <div className={styles.services}>
      <div className={styles.bottomNavAnchor}><ResidentDocuments organizationId={orgId} documents={documents} canUpload={Boolean(currentStay)} /></div>
      <div className={styles.bottomNavAnchor}><ResidentNoticeBoard notices={notices}/></div>
      <div id="food-heading" className={styles.bottomNavAnchor}><div className="grid gap-4"><ResidentFoodMenu menus={foodMenus} />{currentStay && ["ACTIVE", "NOTICE_PERIOD"].includes(currentStay.status) ? <ResidentFoodAvailability orgId={orgId} ranges={foodAvailability} today={today} message={query["food-availability"] === "saved" ? "Your away dates have been saved." : query["food-availability"] === "cancelled" ? "Your away dates have been cancelled." : query["food-availability-error"] === "food-availability-overlap" ? "These dates overlap another away period. Edit the existing dates or choose a different range." : query["food-availability-error"] === "food-availability-outside-stay" ? "Away dates must fall within your current stay and start today or later." : query["food-availability-error"] ? "The away dates could not be saved. Check the dates and try again." : null} /> : null}<ResidentFoodPolls orgId={orgId} polls={foodPolls} timezone={actor.organizationTimezone} message={query["food-voted"] ? "Your meal choice has been saved." : query["food-error"] === "poll-closed" ? "Voting has closed for that poll." : query["food-error"] === "invalid-poll-option" ? "That choice is no longer available. Refresh the page and choose again." : query["food-error"] === "invalid-vote" ? "Choose an option before submitting your vote." : query["food-error"] === "food-suggestion-required" ? "Add a meal suggestion when choosing Will Not Eat." : query["food-error"] === "resident-away" ? "You marked yourself away for this meal, so you cannot vote." : query["food-error"] ? "Your vote could not be saved. Refresh and try again." : null} /></div></div>
      <div className={styles.bottomNavAnchor}><ResidentComplaints orgId={orgId} stays={resident.stays} complaints={complaints} errorCode={query["complaint-error"]} created={query["complaint-created"]} /></div>
    </div>
    <ResidentMobileNav orgId={orgId} />
  </section>;
}
