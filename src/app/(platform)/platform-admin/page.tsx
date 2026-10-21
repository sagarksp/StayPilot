import type { ReactNode } from "react";
import { platformAdminOverview } from "@/infrastructure/platform-admin/prisma-platform-admin-overview";
import { getPlatformBilling, listPlatformBillingProperties } from "@/infrastructure/platform-admin/prisma-platform-billing";
import { listPlatformOwnerInvitations } from "@/infrastructure/platform-admin/owner-invitations";
import { listDemoRequests } from "@/infrastructure/demo-requests/prisma-demo-requests";
import { createPlatformInvoices, decidePlatformPayment, invitePlatformOwner, reviewDemoRequest, savePlatformPricing, updatePlatformOrganizationStatus, updatePlatformPropertyStatus } from "./actions";
import styles from "./platform-admin.module.css";

type SearchParams = Promise<{ "status-error"?: string; "status-updated"?: string; "billing-error"?: string; "billing-updated"?: string; "billing-created"?: string; "payment-reviewed"?: string; "owner-error"?: string; "owner-invited"?: string; "property-error"?: string; "property-updated"?: string; "demo-error"?: string; "demo-updated"?: string }>;

const statusErrors: Readonly<Record<string, string>> = {
  invalid: "Enter a valid organization, status, and reason, then confirm the change.",
  "not-found": "That organization could not be found.",
  unsupported: "Only active and suspended organizations can be changed here.",
  unchanged: "The organization already has that status.",
  conflict: "The organization changed while you were editing it. Refresh and try again.",
  failed: "The status change failed. No change was saved.",
};

const billingErrors: Readonly<Record<string, string>> = {
  "invalid-pricing": "Enter a three-letter currency code and a monthly amount up to two decimal places.",
  "invalid-period": "Choose a valid invoice month.",
  "pricing-required": "Set a positive monthly rate before generating invoices.",
  "select-pgs": "Select at least one active PG to invoice.",
  "pg-unavailable": "One or more selected PGs are no longer active. Refresh the dashboard and try again.",
  "invalid-payment-review": "The payment review details were invalid.",
  "payment-unavailable": "That payment is no longer awaiting review.",
  "payment-exceeds-balance": "Confirming this payment would exceed the invoice total.",
};

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
}

function Section({ id, eyebrow, title, detail, children, open = false }: Readonly<{ id: string; eyebrow: string; title: string; detail: string; children: ReactNode; open?: boolean }>) {
  return <details className={styles.directory} open={open}>
    <summary className={styles.sectionHeader} aria-controls={id}>
      <span><span className={styles.eyebrow}>{eyebrow}</span><span className={styles.sectionTitle}>{title}</span></span>
      <span className={styles.sectionDetail}>{detail}<span className={styles.chevron} aria-hidden="true" /></span>
    </summary>
    <div className={styles.sectionContent} id={id}>{children}</div>
  </details>;
}

export default async function PlatformAdminHomePage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const query = await searchParams;
  const [overview, billing, invitations, pgs] = await Promise.all([
    platformAdminOverview.getOverview(), getPlatformBilling(), listPlatformOwnerInvitations(), listPlatformBillingProperties(),
  ]);
  const demoRequests = await listDemoRequests();
  const pendingDemoRequests = demoRequests.filter((request) => request.status === "PENDING").length;
  const activePgCount = overview.properties.filter((property) => property.status === "ACTIVE").length;
  const activeDemoCount = overview.organizations.filter((organization) => organization.demoExpiresAt && organization.demoExpiresAt > new Date()).length;
  const period = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "UTC" }).format(new Date());
  const money = (amount: string, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
  const totals = (items: readonly { currency: string; amount: string }[]) => items.length ? items.map((item) => money(item.amount, item.currency)).join(" · ") : money("0.00", billing.settings.currency);
  const pendingPayments = billing.invoices.reduce((count, invoice) => count + invoice.payments.filter((payment) => payment.status === "PENDING").length, 0);

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>StayPilot · platform operations</p><h1>Developer dashboard</h1><p>Manage owners, PG access, subscription billing, and payment activity.</p></div>
      <span className={styles.controlBadge}><span />Audited controls</span>
    </header>

    {query["status-updated"] ? <p className={styles.success} role="status">Organization {query["status-updated"] === "suspended" ? "suspended" : "reactivated"}. The change was added to its audit log.</p> : null}
    {query["status-error"] ? <p className={styles.error} role="alert">{statusErrors[query["status-error"]] ?? statusErrors.failed}</p> : null}
    {query["billing-updated"] ? <p className={styles.success} role="status">Monthly subscription pricing saved.</p> : null}
    {query["billing-created"] !== undefined ? <p className={styles.success} role="status">Created {query["billing-created"]} PG invoice{query["billing-created"] === "1" ? "" : "s"}. Already invoiced PGs were skipped.</p> : null}
    {query["payment-reviewed"] ? <p className={styles.success} role="status">Payment {query["payment-reviewed"]} and billing records updated.</p> : null}
    {query["owner-invited"] ? <p className={styles.success} role="status">Owner setup invitation sent. The owner will choose their own password and verify their email.</p> : null}
    {query["owner-error"] ? <p className={styles.error} role="alert">{query["owner-error"] === "email" ? "The invitation could not be emailed. Check Gmail SMTP configuration; no invitation was kept." : "Enter a valid owner name and email address."}</p> : null}
    {query["demo-updated"] ? <p className={styles.success} role="status">{query["demo-updated"] === "invited" ? "Demo setup invitation sent. The access period starts after workspace setup." : "Demo request closed."}</p> : null}
    {query["demo-error"] ? <p className={styles.error} role="alert">{{ invalid: "The demo review details were invalid.", duration: "Choose a demo duration from 1 to 720 hours.", unavailable: "That request has already been reviewed. Refresh the dashboard.", email: "The setup link could not be emailed. No invitation was kept; the request is available to retry." }[query["demo-error"]] ?? "The demo request could not be updated."}</p> : null}
    {query["property-updated"] ? <p className={styles.success} role="status">PG {query["property-updated"] === "active" ? "reactivated" : "deactivated"}. The reason and change were written to the organization audit log.</p> : null}
    {query["property-error"] ? <p className={styles.error} role="alert">{{ invalid: "Enter a valid PG status, reason, and confirmation.", "property-not-found": "That PG could not be found.", "organization-inactive": "Reactivate its organization before changing PG access.", "status-unchanged": "That PG already has the requested status or is archived.", "status-conflict": "The PG status changed while you were editing it. Refresh and try again." }[query["property-error"]] ?? "The PG status could not be changed."}</p> : null}
    {query["billing-error"] ? <p className={styles.error} role="alert">{billingErrors[query["billing-error"]] ?? "The billing action could not be completed."}</p> : null}

    <section aria-label="Platform overview" className={styles.metrics}>
      <article className={styles.metric}><span>Organizations</span><strong>{overview.organizationCount}</strong><small>{overview.activeOrganizationCount} active workspaces</small></article>
      <article className={styles.metric}><span>Active PGs</span><strong>{activePgCount}</strong><small>Currently billable</small></article>
      <article className={styles.metric}><span>Pending receipts</span><strong>{pendingPayments}</strong><small>Awaiting developer review</small></article>
      <article className={styles.metric}><span>Collected revenue</span><strong className={styles.totalList}>{totals(billing.revenueByCurrency)}</strong><small>Confirmed platform receipts</small></article>
      <article className={styles.metric}><span>Open balances</span><strong className={styles.totalList}>{totals(billing.outstandingByCurrency)}</strong><small>Confirmed payments deducted</small></article>
      <article className={styles.metric}><span>Demo requests</span><strong>{pendingDemoRequests}</strong><small>Waiting for review</small></article>
      <article className={styles.metric}><span>Active demo workspaces</span><strong>{activeDemoCount}</strong><small>Time-limited access currently running</small></article>
    </section>

    <Section id="revenue-content" eyebrow="Billing insights" title="Revenue over time" detail="Confirmed receipts · last six months" open>
      {billing.monthlyRevenue.length ? <div className={styles.chartGrid}>
        {billing.monthlyRevenue.map((series) => {
          const values = series.months.map((month) => Number(month.amount));
          const max = Math.max(...values, 0);
          return <section className={styles.chartCard} key={series.currency} aria-label={`Monthly revenue in ${series.currency}`}>
            <div className={styles.chartHeading}><div><span className={styles.eyebrow}>Confirmed revenue</span><h3>{series.currency}</h3></div><span>6 months</span></div>
            <div className={styles.chartBars} role="img" aria-label={`${series.currency} monthly confirmed receipts: ${series.months.map((month) => `${month.label} ${money(month.amount, series.currency)}`).join(", ")}`}>
              {series.months.map((month, index) => {
                const value = values[index] ?? 0;
                const height = max > 0 ? Math.max(value > 0 ? 7 : 2, Math.round(value / max * 100)) : 2;
                return <div className={styles.chartColumn} key={month.period}>
                  <span className={styles.chartAmount}>{value > 0 ? money(month.amount, series.currency) : "—"}</span>
                  <span className={styles.chartTrack}><span className={styles.chartBar} style={{ height: `${height}%` }} /></span>
                  <span className={styles.chartMonth}>{month.label}</span>
                </div>;
              })}
            </div>
          </section>;
        })}
      </div> : <p className={styles.empty}>Confirmed platform receipts will appear here as owners submit payments and you verify them.</p>}
    </Section>

    <Section id="owner-onboarding-content" eyebrow="Owner onboarding" title="Create an owner profile" detail={`${invitations.length} recent invitations`}>
      <form action={invitePlatformOwner} className={styles.formGrid}>
        <label>Owner name<input autoComplete="name" maxLength={180} minLength={2} name="ownerName" required /></label>
        <label>Owner email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
        <button type="submit">Email setup link</button>
      </form>
      <p className={styles.note}>The owner sets a password and verifies their email through the setup link. StayPilot never emails passwords.</p>
      {invitations.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Owner</th><th scope="col">Invitation status</th><th scope="col">Expires</th><th scope="col">Created by</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.publicId}>
        <th scope="row"><span>{invitation.ownerName}</span><small>{invitation.email}</small></th><td>{invitation.acceptedAt ? "Accepted" : invitation.expiresAt > new Date() ? "Pending" : "Expired"}</td><td>{date(invitation.expiresAt)}</td><td>{invitation.createdByEmail}</td>
      </tr>)}</tbody></table></div> : <p className={styles.empty}>No owner invitations yet.</p>}
    </Section>

    <Section id="demo-requests-content" eyebrow="Demo access" title="Demo requests" detail={`${pendingDemoRequests} waiting · ${demoRequests.length} recent`} open={pendingDemoRequests > 0}>
      {demoRequests.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Requester</th><th scope="col">Contact and address</th><th scope="col">Status</th><th scope="col">Review</th></tr></thead><tbody>{demoRequests.map((request) => <tr key={request.publicId}>
        <th scope="row"><span>{request.name}</span><small>{request.email}</small><small>Requested {date(request.createdAt)}</small></th>
        <td><span>{request.phoneCountryCode} {request.phoneNumber}</span><small>{request.address}</small></td>
        <td><span className={`${styles.status} ${request.status === "PENDING" ? styles.statusOther : styles.statusActive}`}>{statusLabel(request.status)}</span>{request.invitation ? <small className={styles.secondaryLine}>{request.invitation.demoDurationHours} hours · {request.invitation.acceptedAt ? "setup link used" : `link expires ${date(request.invitation.expiresAt)}`}</small> : null}</td>
        <td>{request.status === "PENDING" ? <div className={styles.statusForm}>
          <form action={reviewDemoRequest}><input name="requestId" type="hidden" value={request.publicId} /><label><span>Access duration</span><div className={styles.formGrid}><input aria-label="Demo access duration in hours" defaultValue="72" max="720" min="1" name="durationHours" required type="number" /><span>hours (up to 30 days)</span></div></label><button className={styles.activateButton} name="decision" type="submit" value="GRANT">Email setup link</button></form>
          <form action={reviewDemoRequest}><input name="requestId" type="hidden" value={request.publicId} /><button className={styles.suspendButton} name="decision" type="submit" value="CLOSE">Close request</button></form>
        </div> : <span className={styles.unavailable}>{request.reviewedAt ? `${request.status === "INVITED" ? "Reviewed" : "Closed"} ${date(request.reviewedAt)} by ${request.reviewedByEmail}` : "No action available"}</span>}</td>
      </tr>)}</tbody></table></div> : <p className={styles.empty}>No demo requests yet. New requests from the public demo page will appear here.</p>}
      <p className={styles.note}>Granting a request emails a one-time account setup link. The demo timer begins when the owner verifies their email and creates a workspace. Demo access expires automatically; passwords are never sent by email.</p>
    </Section>

    <Section id="subscription-settings-content" eyebrow="Subscriptions" title="Pricing and PG invoices" detail={`${pgs.length} active PGs available`}>
      <form action={savePlatformPricing} className={styles.formGrid}>
        <label>Monthly price per PG<input defaultValue={billing.settings.monthlyRate} inputMode="decimal" maxLength={11} name="monthlyRate" required /></label>
        <label>Currency code<input defaultValue={billing.settings.currency} maxLength={3} name="currency" required /></label>
        <button type="submit">Save pricing</button>
      </form>
      <form action={createPlatformInvoices} className={styles.invoiceForm}>
        <div className={styles.formGrid}>
          <label>Invoice month<input defaultValue={period} name="period" required type="month" /></label>
          <button type="submit">Create selected invoices</button>
        </div>
        {pgs.length ? <fieldset className={styles.pgPicker}>
          <legend>Select PGs to invoice</legend>
          <div className={styles.pgGrid}>{pgs.map((pg) => <label className={styles.pgOption} key={pg.publicId}>
            <input name="propertyIds" type="checkbox" value={pg.publicId} />
            <span><b>{pg.name}</b><small>{pg.organization.name}</small></span>
          </label>)}</div>
        </fieldset> : <p className={styles.empty}>There are no active PGs in active organizations to invoice.</p>}
      </form>
      <p className={styles.note}>Each invoice covers one selected PG and snapshots the current monthly price and currency. The daily scheduler invoices all active PGs; this form lets you create invoices for selected PGs or backfill a month. PGs already invoiced for that month are skipped.</p>
    </Section>

    <Section id="invoice-activity-content" eyebrow="Collections" title="Invoices and payment activity" detail={`${billing.invoices.length} latest invoices`}>
      {billing.invoices.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Owner / organization</th><th scope="col">PG</th><th scope="col">Period</th><th scope="col">Invoice</th><th scope="col">Payments</th></tr></thead><tbody>{billing.invoices.map((invoice) => <tr key={invoice.id}>
        <th scope="row"><span>{invoice.organization}</span><small>{invoice.ownerEmail}</small></th>
        <td>{invoice.property ?? `Organization invoice · ${invoice.activePgCount} PGs`}</td>
        <td>{invoice.period}</td>
        <td><span className={`${styles.status} ${invoice.status === "PAID" ? styles.statusActive : styles.statusOther}`}>{statusLabel(invoice.status)}</span><small className={styles.secondaryLine}>{money(invoice.totalAmount, invoice.currency)} · {money(invoice.monthlyRate, invoice.currency)} / PG · due {date(invoice.dueAt)}</small></td>
        <td>{invoice.payments.length ? <div className={styles.paymentList}>{invoice.payments.map((payment) => <div className={styles.paymentRecord} key={payment.id}>
          <span><b>{money(payment.amount, invoice.currency)}</b> · {payment.method.replaceAll("_", " ")} · {statusLabel(payment.status)}</span>
          <small>{payment.submittedByEmail}{payment.reference ? ` · Ref ${payment.reference}` : ""}</small>
          {payment.status === "PENDING" ? <form action={decidePlatformPayment} className={styles.reviewForm}><input name="paymentId" type="hidden" value={payment.id} /><input aria-label="Review note" maxLength={500} name="note" placeholder="Optional review note" /><button name="decision" type="submit" value="CONFIRMED">Confirm</button><button className={styles.rejectButton} name="decision" type="submit" value="REJECTED">Reject</button></form> : null}
        </div>)}</div> : <span className={styles.unavailable}>No payments submitted</span>}</td>
      </tr>)}</tbody></table></div> : <p className={styles.empty}>No platform invoices yet. Set your rate and select PGs to create invoices.</p>}
    </Section>

    <Section id="organizations-content" eyebrow="Tenants" title="Organizations" detail={`${overview.organizationCount} total · ${overview.activeOrganizationCount} active`}>
      {overview.organizations.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Organization</th><th scope="col">Status</th><th scope="col">Demo access</th><th scope="col">PGs</th><th scope="col">Members</th><th scope="col">Timezone</th><th scope="col">Created</th><th scope="col">Access control</th></tr></thead><tbody>{overview.organizations.map((organization) => {
        const targetStatus = organization.status === "ACTIVE" ? "SUSPENDED" : organization.status === "SUSPENDED" ? "ACTIVE" : null;
        return <tr key={organization.publicId}>
          <th scope="row"><span>{organization.name}</span><small>{organization.publicId}</small></th>
          <td><span className={`${styles.status} ${organization.status === "ACTIVE" ? styles.statusActive : styles.statusOther}`}>{statusLabel(organization.status)}</span></td>
          <td>{organization.demoExpiresAt ? organization.demoExpiresAt <= new Date() ? <span>Expired {date(organization.demoExpiresAt)}</span> : <span>Until {date(organization.demoExpiresAt)}</span> : <span className={styles.unavailable}>Standard workspace</span>}</td>
          <td>{organization.propertyCount}</td><td>{organization.activeMembershipCount}</td><td>{organization.timezone}</td><td>{date(organization.createdAt)}</td>
          <td>{targetStatus ? <form action={updatePlatformOrganizationStatus} className={styles.statusForm}>
            <input name="organizationId" type="hidden" value={organization.publicId} /><input name="status" type="hidden" value={targetStatus} />
            <label><span>Reason (10 to 500 characters)</span><input autoComplete="off" maxLength={500} minLength={10} name="reason" placeholder={targetStatus === "SUSPENDED" ? "Why suspend access?" : "Why restore access?"} required /></label>
            <label className={styles.confirm}><input name="confirmation" required type="checkbox" value="yes" /><span>Confirm this change</span></label>
            <button className={targetStatus === "SUSPENDED" ? styles.suspendButton : styles.activateButton} type="submit">{targetStatus === "SUSPENDED" ? "Suspend" : "Reactivate"}</button>
          </form> : <span className={styles.unavailable}>No control for this status</span>}</td>
        </tr>;
      })}</tbody></table></div> : <p className={styles.empty}>No organizations have been created yet.</p>}
      <p className={styles.note}>{overview.otherOrganizationCount} organization(s) have a non-active status. Suspensions block tenant workspace access but preserve stored records. Every change requires a reason and is written to the organization audit log.</p>
    </Section>

    <Section id="pg-access-content" eyebrow="Property access" title="All PGs" detail={`${activePgCount} active · ${overview.properties.length} total`}>
      {overview.properties.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">PG</th><th scope="col">Organization</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Access control</th></tr></thead><tbody>{overview.properties.map((property) => {
        const targetStatus = property.status === "ACTIVE" ? "INACTIVE" : property.status === "INACTIVE" ? "ACTIVE" : null;
        return <tr key={property.publicId}>
          <th scope="row"><span>{property.name}</span><small>{property.publicId}</small></th><td>{property.organizationName}</td>
          <td><span className={`${styles.status} ${property.status === "ACTIVE" ? styles.statusActive : styles.statusOther}`}>{statusLabel(property.status)}</span></td><td>{date(property.createdAt)}</td>
          <td>{targetStatus ? <form action={updatePlatformPropertyStatus} className={styles.statusForm}>
            <input name="propertyId" type="hidden" value={property.publicId} /><input name="status" type="hidden" value={targetStatus} />
            <label><span>Reason (10 to 500 characters)</span><input autoComplete="off" maxLength={500} minLength={10} name="reason" placeholder={targetStatus === "INACTIVE" ? "Why deactivate this PG?" : "Why reactivate this PG?"} required /></label>
            <label className={styles.confirm}><input name="confirmation" required type="checkbox" value="yes" /><span>Confirm this change</span></label>
            <button className={targetStatus === "INACTIVE" ? styles.suspendButton : styles.activateButton} type="submit">{targetStatus === "INACTIVE" ? "Deactivate" : "Reactivate"}</button>
          </form> : <span className={styles.unavailable}>Archived PGs cannot be changed here</span>}</td>
        </tr>;
      })}</tbody></table></div> : <p className={styles.empty}>No PGs have been created yet.</p>}
      <p className={styles.note}>Inactive PGs are excluded from future monthly billing. Existing invoices and records remain available.</p>
    </Section>
  </div>;
}
