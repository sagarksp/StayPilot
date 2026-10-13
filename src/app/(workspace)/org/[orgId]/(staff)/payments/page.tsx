import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";

const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

export default async function PaymentsPage({ params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const invoices = await billingUseCases.listInvoices(actor);
  const payments = invoices.flatMap((invoice) => invoice.payments.map((payment) => ({
    ...payment,
    invoiceNumber: invoice.invoiceNumber,
    residentName: invoice.residentStay.resident.name,
    propertyName: invoice.property.name,
  }))).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#176e61]">FINANCE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h1>
      <p className="muted mt-2 max-w-2xl leading-6">Recorded rent payments for invoices in your accessible properties.</p>
    </header>
    <div className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4 sm:px-6">
        <div><h2 className="text-lg font-semibold">Payment history</h2><p className="muted mt-1 text-sm">{payments.length} {payments.length === 1 ? "payment" : "payments"}</p></div>
        <Link className="rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/finance`}>Review invoices</Link>
      </header>
      {payments.length ? <div className="divide-y divide-[#e2e8f0]">{payments.map((payment) => <article className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6" key={payment.publicId}>
        <div><h3 className="font-semibold">{payment.residentName} <span className="font-normal text-slate-500">· {payment.propertyName}</span></h3><p className="muted mt-1 text-sm">{payment.invoiceNumber} · {date(payment.paymentDate)} · {payment.method.replaceAll("_", " ")}{payment.reference ? ` · Ref ${payment.reference}` : ""}</p>{payment.notes ? <p className="muted mt-1 text-sm">{payment.notes}</p> : null}<p className="mt-1 text-xs text-slate-500">Recorded by {payment.recordedByName}</p></div>
        <strong className="text-lg">{money(payment.amountPaise)}</strong>
      </article>)}</div> : <div className="px-5 py-14 text-center sm:px-6"><h2 className="font-semibold">No payments recorded yet</h2><p className="muted mx-auto mt-2 max-w-lg text-sm leading-6">Record payments from finalized invoices. Partial payments stay on the invoice until its balance is paid.</p><Link className="mt-4 inline-flex rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/finance`}>Open invoices</Link></div>}
    </div>
  </section>;
}
