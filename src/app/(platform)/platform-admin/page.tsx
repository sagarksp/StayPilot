import { platformAdminOverview } from "@/infrastructure/platform-admin/prisma-platform-admin-overview";
import { getPlatformBilling } from "@/infrastructure/platform-admin/prisma-platform-billing";
import { listPlatformOwnerInvitations } from "@/infrastructure/platform-admin/owner-invitations";
import { createPlatformInvoices, decidePlatformPayment, invitePlatformOwner, savePlatformPricing, updatePlatformOrganizationStatus, updatePlatformPropertyStatus } from "./actions";
import styles from "./platform-admin.module.css";

type SearchParams = Promise<{ "status-error"?: string; "status-updated"?: string; "billing-error"?: string; "billing-updated"?: string; "billing-created"?: string; "payment-reviewed"?: string; "owner-error"?: string; "owner-invited"?: string; "property-error"?: string; "property-updated"?: string }>;

const statusErrors: Readonly<Record<string, string>> = {
  invalid: "Enter a valid organization, status, and reason, then confirm the change.",
  "not-found": "That organization could not be found.",
  unsupported: "Only active and suspended organizations can be changed here.",
  unchanged: "The organization already has that status.",
  conflict: "The organization changed while you were editing it. Refresh and try again.",
  failed: "The status change failed. No change was saved.",
};

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
}

export default async function PlatformAdminHomePage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const query = await searchParams;
  const [overview, billing, invitations] = await Promise.all([platformAdminOverview.getOverview(), getPlatformBilling(), listPlatformOwnerInvitations()]);
  const activePgCount = overview.properties.filter((property) => property.status === "ACTIVE").length;
  const period = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "UTC" }).format(new Date());
  const money = (amount: string, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
  const totals = (items: readonly { currency: string; amount: string }[]) => items.length ? items.map((item) => money(item.amount, item.currency)).join(" · ") : money("0.00", billing.settings.currency);

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>Platform operations</p><h1>Organization overview</h1><p>Monitor tenant setup and account activity across StayPilot.</p></div>
      <span className={styles.controlBadge}><span />Audited controls</span>
    </header>

    {query["status-updated"] ? <p className={styles.success} role="status">Organization {query["status-updated"] === "suspended" ? "suspended" : "reactivated"}. The change was added to its audit log.</p> : null}
    {query["status-error"] ? <p className={styles.error} role="alert">{statusErrors[query["status-error"]] ?? statusErrors.failed}</p> : null}

    {query["billing-updated"] ? <p className={styles.success} role="status">Monthly subscription pricing saved.</p> : null}
    {query["billing-created"] !== undefined ? <p className={styles.success} role="status">Created {query["billing-created"]} new invoice{query["billing-created"] === "1" ? "" : "s"}. Existing invoices for that month were left unchanged.</p> : null}
    {query["payment-reviewed"] ? <p className={styles.success} role="status">Payment {query["payment-reviewed"]} and billing records updated.</p> : null}
    {query["owner-invited"] ? <p className={styles.success} role="status">Owner setup invitation sent. The owner will choose their own password and verify their email.</p> : null}
    {query["owner-error"] ? <p className={styles.error} role="alert">{query["owner-error"] === "email" ? "The invitation could not be emailed. Check Gmail SMTP configuration; no invitation was kept." : "Enter a valid owner name and email address."}</p> : null}
    {query["property-updated"] ? <p className={styles.success} role="status">PG {query["property-updated"] === "active" ? "reactivated" : "deactivated"}. The reason and change were written to the organization audit log.</p> : null}
    {query["property-error"] ? <p className={styles.error} role="alert">{{ invalid: "Enter a valid PG status, reason, and confirmation.", "property-not-found": "That PG could not be found.", "organization-inactive": "Reactivate its organization before changing PG access.", "status-unchanged": "That PG already has the requested status or is archived.", "status-conflict": "The PG status changed while you were editing it. Refresh and try again." }[query["property-error"]] ?? "The PG status could not be changed."}</p> : null}
    {query["billing-error"] ? <p className={styles.error} role="alert">{{ "invalid-pricing": "Enter a three-letter currency code and a monthly amount up to two decimal places.", "invalid-period": "Choose a valid invoice month.", "pricing-required": "Set a positive monthly rate before generating invoices.", "invalid-payment-review": "The payment review details were invalid.", "payment-unavailable": "That payment is no longer awaiting review.", "payment-exceeds-balance": "Confirming this payment would exceed the invoice total." }[query["billing-error"]] ?? "The billing action could not be completed."}</p> : null}

    <section aria-label="Platform totals" className={styles.metrics}>
      <article className={styles.metric}><span>Organizations</span><strong>{overview.organizationCount}</strong><small>All tenant workspaces</small></article>
      <article className={styles.metric}><span>Active</span><strong>{overview.activeOrganizationCount}</strong><small>Available organization workspaces</small></article>
      <article className={styles.metric}><span>Properties</span><strong>{overview.propertyCount}</strong><small>Non-archived properties</small></article>
      <article className={styles.metric}><span>Active PGs</span><strong>{activePgCount}</strong><small>Currently billable PGs</small></article>
      <article className={styles.metric}><span>Active memberships</span><strong>{overview.activeMembershipCount}</strong><small>Staff and resident accounts</small></article>
    </section>

    <section aria-label="Create owner profile" className={styles.directory}>
      <header><div><p className={styles.eyebrow}>Owner onboarding</p><h2>Create an owner profile</h2></div><span>Secure setup link · expires in 7 days</span></header>
      <form action={invitePlatformOwner} className={styles.billingForm}>
        <label>Owner name<input autoComplete="name" maxLength={180} minLength={2} name="ownerName" required /></label>
        <label>Owner email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
        <button type="submit">Email owner setup link</button>
      </form>
      <p className={styles.note}>The owner sets their password and verifies their email through the existing signup flow. StayPilot never sends a password by email. The owner creates their workspace and first PG after signing in.</p>
      {invitations.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Owner</th><th scope="col">Invitation status</th><th scope="col">Expires</th><th scope="col">Created by</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.publicId}><th scope="row"><span>{invitation.ownerName}</span><small>{invitation.email}</small></th><td>{invitation.acceptedAt ? "Accepted" : invitation.expiresAt > new Date() ? "Pending" : "Expired"}</td><td>{date(invitation.expiresAt)}</td><td>{invitation.createdByEmail}</td></tr>)}</tbody></table></div> : null}
    </section>

    <section aria-label="Platform subscription billing" className={styles.billingGrid}>
      <article className={styles.directory}>
        <header><div><p className={styles.eyebrow}>Subscription settings</p><h2>Monthly PG pricing</h2></div></header>
        <form action={savePlatformPricing} className={styles.billingForm}>
          <label>Monthly price per active PG<input defaultValue={billing.settings.monthlyRate} inputMode="decimal" maxLength={11} name="monthlyRate" required /></label>
          <label>Currency code<input defaultValue={billing.settings.currency} maxLength={3} name="currency" required /></label>
          <button type="submit">Save pricing</button>
        </form>
        <form action={createPlatformInvoices} className={styles.billingForm}>
          <label>Invoice month<input defaultValue={period} name="period" required type="month" /></label>
          <button type="submit">Generate owner invoices</button>
        </form>
        <p className={styles.note}>Each invoice snapshots the organization’s active PG count, configured rate, and currency. Invoice generation skips organizations without active PGs and does not duplicate a month already billed.</p>
      </article>
      <article className={styles.metric}><span>Collected platform revenue</span><strong className={styles.totalList}>{totals(billing.revenueByCurrency)}</strong><small>Confirmed receipts, shown in each invoice currency</small></article>
      <article className={styles.metric}><span>Open invoice balance</span><strong className={styles.totalList}>{totals(billing.outstandingByCurrency)}</strong><small>Balance after confirmed payments; pending submissions are not counted</small></article>
    </section>

    <section aria-labelledby="platform-invoices-heading" className={styles.directory}>
      <header><div><p className={styles.eyebrow}>Owner subscriptions</p><h2 id="platform-invoices-heading">Invoices and payment activity</h2></div><span>{billing.invoices.length} latest invoices</span></header>
      {billing.invoices.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Owner / organization</th><th scope="col">Period</th><th scope="col">Active PGs</th><th scope="col">Rate</th><th scope="col">Invoice</th><th scope="col">Payment activity</th></tr></thead><tbody>{billing.invoices.map((invoice) => <tr key={invoice.id}>
        <th scope="row"><span>{invoice.organization}</span><small>{invoice.ownerEmail}</small></th>
        <td>{invoice.period}</td><td>{invoice.activePgCount}</td><td>{money(invoice.monthlyRate, invoice.currency)} / PG</td>
        <td><span className={`${styles.status} ${invoice.status === "PAID" ? styles.statusActive : styles.statusOther}`}>{invoice.status}</span><small className={styles.secondaryLine}>{money(invoice.totalAmount, invoice.currency)} · due {date(invoice.dueAt)}</small></td>
        <td>{invoice.payments.length ? <div className={styles.paymentList}>{invoice.payments.map((payment) => <div className={styles.paymentRecord} key={payment.id}><span><b>{money(payment.amount, invoice.currency)}</b> · {payment.method.replaceAll("_", " ")} · {payment.status}</span><small>{payment.submittedByEmail}{payment.reference ? ` · Ref ${payment.reference}` : ""}</small>{payment.status === "PENDING" ? <form action={decidePlatformPayment} className={styles.reviewForm}><input name="paymentId" type="hidden" value={payment.id} /><input aria-label="Review note" maxLength={500} name="note" placeholder="Optional review note" /><button name="decision" type="submit" value="CONFIRMED">Confirm</button><button className={styles.rejectButton} name="decision" type="submit" value="REJECTED">Reject</button></form> : null}</div>)}</div> : <span className={styles.unavailable}>No payments submitted</span>}</td>
      </tr>)}</tbody></table></div> : <p className={styles.empty}>No platform invoices yet. Set your monthly rate, then generate invoices for a month.</p>}
    </section>

    <section aria-labelledby="organizations-heading" className={styles.directory}>
      <header><div><p className={styles.eyebrow}>Tenant directory</p><h2 id="organizations-heading">Organizations</h2></div><span>{overview.organizationCount} total</span></header>
      {overview.organizations.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Organization</th><th scope="col">Status</th><th scope="col">Properties</th><th scope="col">Active memberships</th><th scope="col">Timezone</th><th scope="col">Created</th><th scope="col">Access control</th></tr></thead><tbody>{overview.organizations.map((organization) => {
        const targetStatus = organization.status === "ACTIVE" ? "SUSPENDED" : organization.status === "SUSPENDED" ? "ACTIVE" : null;
        return <tr key={organization.publicId}>
          <th scope="row"><span>{organization.name}</span><small>{organization.publicId}</small></th>
          <td><span className={`${styles.status} ${organization.status === "ACTIVE" ? styles.statusActive : styles.statusOther}`}><span />{statusLabel(organization.status)}</span></td>
          <td>{organization.propertyCount}</td><td>{organization.activeMembershipCount}</td><td>{organization.timezone}</td><td>{date(organization.createdAt)}</td>
          <td>{targetStatus ? <form action={updatePlatformOrganizationStatus} className={styles.statusForm}>
            <input name="organizationId" type="hidden" value={organization.publicId} />
            <input name="status" type="hidden" value={targetStatus} />
            <label><span>Reason (10 to 500 characters)</span><input autoComplete="off" maxLength={500} minLength={10} name="reason" placeholder={targetStatus === "SUSPENDED" ? "Why should access be suspended?" : "Why is access being restored?"} required /></label>
            <label className={styles.confirm}><input name="confirmation" required type="checkbox" value="yes" /><span>I confirm this change</span></label>
            <button className={targetStatus === "SUSPENDED" ? styles.suspendButton : styles.activateButton} type="submit">{targetStatus === "SUSPENDED" ? "Suspend access" : "Reactivate access"}</button>
          </form> : <span className={styles.unavailable}>No control for this status</span>}</td>
        </tr>;
      })}</tbody></table></div> : <p className={styles.empty}>No organizations have been created yet.</p>}
      <p className={styles.note}>{overview.otherOrganizationCount} organization{overview.otherOrganizationCount === 1 ? "" : "s"} have a non-active status. Suspending an organization immediately blocks tenant workspace access; stored records remain intact. Every status change requires a reason and is written to that organization's audit log.</p>
    </section>

    <section aria-labelledby="properties-heading" className={styles.directory}>
      <header><div><p className={styles.eyebrow}>PG access controls</p><h2 id="properties-heading">All PGs</h2></div><span>{activePgCount} active</span></header>
      {overview.properties.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">PG</th><th scope="col">Organization</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Access control</th></tr></thead><tbody>{overview.properties.map((property) => {
        const targetStatus = property.status === "ACTIVE" ? "INACTIVE" : property.status === "INACTIVE" ? "ACTIVE" : null;
        return <tr key={property.publicId}><th scope="row"><span>{property.name}</span><small>{property.publicId}</small></th><td>{property.organizationName}</td><td><span className={`${styles.status} ${property.status === "ACTIVE" ? styles.statusActive : styles.statusOther}`}>{statusLabel(property.status)}</span></td><td>{date(property.createdAt)}</td><td>{targetStatus ? <form action={updatePlatformPropertyStatus} className={styles.statusForm}><input name="propertyId" type="hidden" value={property.publicId} /><input name="status" type="hidden" value={targetStatus} /><label><span>Reason (10 to 500 characters)</span><input autoComplete="off" maxLength={500} minLength={10} name="reason" placeholder={targetStatus === "INACTIVE" ? "Why should this PG be deactivated?" : "Why is this PG being reactivated?"} required /></label><label className={styles.confirm}><input name="confirmation" required type="checkbox" value="yes" /><span>I confirm this change</span></label><button className={targetStatus === "INACTIVE" ? styles.suspendButton : styles.activateButton} type="submit">{targetStatus === "INACTIVE" ? "Deactivate PG" : "Reactivate PG"}</button></form> : <span className={styles.unavailable}>Archived PGs cannot be changed here</span>}</td></tr>;
      })}</tbody></table></div> : <p className={styles.empty}>No PGs have been created yet.</p>}
      <p className={styles.note}>Inactive PGs are excluded from monthly subscription billing while their records remain intact. Each status change requires a reason and is added to the organization audit log.</p>
    </section>
  </div>;
}
