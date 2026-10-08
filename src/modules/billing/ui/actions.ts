"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { billingUseCases } from "../application/use-cases";

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
