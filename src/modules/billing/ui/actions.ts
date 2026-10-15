"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { billingUseCases } from "../application/use-cases";
import { recordPaymentSchema, reversePaymentFormSchema } from "../application/schemas";

export async function reversePaymentAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "").trim();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || randomUUID();
  const parsed = reversePaymentFormSchema.safeParse({ amount: String(formData.get("amount") ?? ""), reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) redirect(`/org/${orgId}/finance?error=invalid-reversal`);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await billingUseCases.reversePayment(actor, paymentId, parsed.data, idempotencyKey);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    if (error instanceof Error && error.message === "IDEMPOTENCY_KEY_REUSED") redirect(`/org/${orgId}/finance?error=reversal-key-reused`);
    if (error instanceof Error && error.message === "REVERSAL_EXCEEDS_UNREVERSED_AMOUNT") redirect(`/org/${orgId}/finance?error=reversal-exceeds-remaining`);
    if (error instanceof Error && (error.message === "PAYMENT_NOT_REVERSIBLE" || error.message === "INVOICE_CHANGED")) redirect(`/org/${orgId}/finance?error=payment-not-reversible`);
    throw error;
  }
  revalidatePath(`/org/${orgId}/finance`);
  revalidatePath(`/org/${orgId}/payments`);
  revalidatePath(`/org/${orgId}/owner`);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/finance?payment-reversed=1`);
}

export async function finalizeInvoiceAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await billingUseCases.finalize(actor, invoiceId);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    if (error instanceof Error && error.message === "INVOICE_NOT_DRAFT") redirect(`/org/${orgId}/finance?error=invoice-changed`);
    throw error;
  }
  revalidatePath(`/org/${orgId}/finance`);
  revalidatePath(`/org/${orgId}/owner`);
  redirect(`/org/${orgId}/finance?finalized=1`);
}

export async function recordPaymentAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "").trim();
  const parsed = recordPaymentSchema.safeParse({
    invoiceId: String(formData.get("invoiceId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    method: String(formData.get("method") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) redirect(`/org/${orgId}/finance?error=invalid-payment`);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await billingUseCases.recordPayment(actor, parsed.data);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") redirect(`/org/${orgId}/finance?error=payment-exceeds-balance`);
    if (error instanceof Error && (error.message === "INVOICE_NOT_PAYABLE" || error.message === "INVOICE_CHANGED")) redirect(`/org/${orgId}/finance?error=invoice-changed`);
    throw error;
  }
  revalidatePath(`/org/${orgId}/finance`);
  revalidatePath(`/org/${orgId}/owner`);
  redirect(`/org/${orgId}/finance?payment-recorded=1`);
}
