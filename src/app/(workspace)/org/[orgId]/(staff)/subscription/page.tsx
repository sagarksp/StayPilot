import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { prisma } from "@/infrastructure/db/prisma";
import { getOwnerPlatformBilling } from "@/infrastructure/platform-admin/prisma-platform-billing";
import styles from "./subscription.module.css";
import { submitOwnerPlatformPayment } from "./actions";

type SearchParams = Promise<{ error?: string; submitted?: string }>;
const errors: Record<string, string> = {
  invalid: "Enter a valid amount, date, and payment method.",
  "invoice-unavailable": "That invoice is no longer open for payment submissions.",
  "amount-exceeds-balance": "This amount is greater than the remaining invoice balance, including submissions awaiting review.",
};

function money(value: string, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

export default async function OwnerSubscriptionPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER")) notFound();
  const organization = await prisma.organization.findUnique({ where: { publicId: orgId }, select: { id: true } });
  if (!organization) notFound();
  const [invoices, query] = await Promise.all([getOwnerPlatformBilling(organization.id), searchParams]);
  const today = new Date().toISOString().slice(0, 10);

  return <main className={styles.page}>
    <header><p className={styles.eyebrow}>StayPilot subscription</p><h1>Platform billing</h1><p>Your owner account can view invoices and submit external payment details for verification.</p></header>
    {query.submitted ? <p className={styles.success} role="status">Payment details submitted. The invoice will update after the developer verifies the payment.</p> : null}
    {query.error ? <p className={styles.error} role="alert">{errors[query.error] ?? "The payment could not be submitted."}</p> : null}
    {invoices.length ? <div className={styles.list}>{invoices.map((invoice) => {
      const confirmed = invoice.payments.filter((payment) => payment.status === "CONFIRMED").reduce((total, payment) => total + Number(payment.amount), 0);
      const pending = invoice.payments.filter((payment) => payment.status === "PENDING").reduce((total, payment) => total + Number(payment.amount), 0);
      const balance = Math.max(0, Number(invoice.totalAmount) - confirmed);
      return <article className={styles.invoice} key={invoice.id}>
        <div className={styles.invoiceHeading}><div><span className={styles.period}>{invoice.period}</span><h2>{money(invoice.totalAmount, invoice.currency)}</h2><p>{invoice.property ? `PG: ${invoice.property}` : `${invoice.activePgCount} PG organization invoice`} · {money(invoice.monthlyRate, invoice.currency)} / month</p></div><span className={`${styles.status} ${invoice.status === "PAID" ? styles.paid : styles.open}`}>{invoice.status}</span></div>
        <div className={styles.invoiceMeta}><span>Due {date(invoice.dueAt)}</span><span>Confirmed {money(confirmed.toFixed(2), invoice.currency)}</span><span>Awaiting review {money(pending.toFixed(2), invoice.currency)}</span><span>Remaining {money(Math.max(0, balance - pending).toFixed(2), invoice.currency)}</span></div>
        {invoice.status !== "PAID" && balance > pending ? <form action={submitOwnerPlatformPayment.bind(null, orgId)} className={styles.paymentForm}>
          <h3>Submit an external payment</h3>
          <label>Amount<input inputMode="decimal" name="amount" pattern="[0-9]+(\.[0-9]{1,2})?" required /></label>
          <label>Method<select defaultValue="UPI" name="method"><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
          <label>Payment date<input defaultValue={today} name="paidAt" required type="date" /></label>
          <label>Reference<input maxLength={180} name="reference" placeholder="UPI / transaction reference" /></label>
          <label className={styles.wide}>Note<input maxLength={500} name="note" placeholder="Optional details for the developer" /></label>
          <input name="invoiceId" type="hidden" value={invoice.id} />
          <button type="submit">Submit for verification</button>
          <small>Submitting details does not mark an invoice as paid. The developer confirms the receipt.</small>
        </form> : null}
        {invoice.payments.length ? <div className={styles.history}><h3>Payment history</h3>{invoice.payments.map((payment) => <div className={styles.payment} key={payment.id}><span><b>{money(payment.amount, invoice.currency)}</b> · {payment.method.replaceAll("_", " ")} · {payment.status}</span><small>{date(payment.paidAt)}{payment.reference ? ` · Ref ${payment.reference}` : ""}{payment.note ? ` · ${payment.note}` : ""}</small></div>)}</div> : null}
      </article>;
    })}</div> : <p className={styles.empty}>There are no platform invoices for this workspace yet.</p>}
  </main>;
}
