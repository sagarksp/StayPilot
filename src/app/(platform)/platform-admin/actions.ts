"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { isPlatformAdminIdentity } from "@/infrastructure/auth/platform-admin-access";
import { platformOrganizationStatus } from "@/infrastructure/platform-admin/prisma-platform-admin-status";
import { generatePlatformInvoices, reviewPlatformPayment, updatePlatformPricing } from "@/infrastructure/platform-admin/prisma-platform-billing";
import { createPlatformOwnerInvitation } from "@/infrastructure/platform-admin/owner-invitations";
import { platformPropertyStatus } from "@/infrastructure/platform-admin/prisma-platform-property-status";
import { attachDemoInvitation, claimDemoRequest, closeDemoRequest, releaseDemoRequest } from "@/infrastructure/demo-requests/prisma-demo-requests";
import { PlatformPropertyStatusError, platformPropertyStatusSchema } from "@/modules/platform-admin/application/property-status";
import { PlatformOrganizationStatusError, platformOrganizationStatusSchema } from "@/modules/platform-admin/application/organization-status";

function failureCode(error: unknown) {
  if (!(error instanceof PlatformOrganizationStatusError)) return "failed";
  switch (error.code) {
    case "ORGANIZATION_NOT_FOUND": return "not-found";
    case "STATUS_UNSUPPORTED": return "unsupported";
    case "STATUS_UNCHANGED": return "unchanged";
    case "STATUS_CONFLICT": return "conflict";
  }
}

export async function updatePlatformOrganizationStatus(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();

  const parsed = platformOrganizationStatusSchema.safeParse({
    organizationId: formData.get("organizationId"),
    status: formData.get("status"),
    reason: formData.get("reason"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) redirect("/platform-admin?status-error=invalid");

  try {
    await platformOrganizationStatus.updateStatus(session.user.email, parsed.data);
  } catch (error) {
    redirect(`/platform-admin?status-error=${failureCode(error)}`);
  }

  revalidatePath("/platform-admin");
  redirect(`/platform-admin?status-updated=${parsed.data.status.toLowerCase()}`);
}

export async function savePlatformPricing(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const monthlyRate = String(formData.get("monthlyRate") ?? "").trim();
  if (!/^[A-Z]{3}$/.test(currency) || !/^\d{1,8}(?:\.\d{1,2})?$/.test(monthlyRate)) redirect("/platform-admin?billing-error=invalid-pricing");
  await updatePlatformPricing({ currency, monthlyRate, updatedByEmail: session.user.email });
  revalidatePath("/platform-admin");
  redirect("/platform-admin?billing-updated=pricing");
}

export async function createPlatformInvoices(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) redirect("/platform-admin?billing-error=invalid-period");
  const propertyIds = formData.getAll("propertyIds").map((value) => String(value));
  if (!propertyIds.length || propertyIds.length > 200 || propertyIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) redirect("/platform-admin?billing-error=select-pgs");
  try {
    const count = await generatePlatformInvoices(period, propertyIds);
    revalidatePath("/platform-admin");
    redirect(`/platform-admin?billing-created=${count}`);
  } catch (error) {
    if (error instanceof Error && error.message === "PRICING_NOT_CONFIGURED") redirect("/platform-admin?billing-error=pricing-required");
    if (error instanceof Error && error.message === "PROPERTY_UNAVAILABLE") redirect("/platform-admin?billing-error=pg-unavailable");
    throw error;
  }
}

export async function decidePlatformPayment(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const noteValue = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId) || (decision !== "CONFIRMED" && decision !== "REJECTED") || noteValue.length > 500) redirect("/platform-admin?billing-error=invalid-payment-review");
  try {
    await reviewPlatformPayment({ paymentId, reviewerEmail: session.user.email, decision, note: noteValue || null });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_UNAVAILABLE") redirect("/platform-admin?billing-error=payment-unavailable");
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") redirect("/platform-admin?billing-error=payment-exceeds-balance");
    throw error;
  }
  revalidatePath("/platform-admin");
  revalidatePath("/org", "layout");
  redirect(`/platform-admin?payment-reviewed=${decision.toLowerCase()}`);
}

export async function invitePlatformOwner(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (ownerName.length < 2 || ownerName.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/platform-admin?owner-error=invalid");
  try {
    await createPlatformOwnerInvitation({ ownerName, email, createdByEmail: session.user.email });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_DELIVERY_FAILED") redirect("/platform-admin?owner-error=email");
    throw error;
  }
  revalidatePath("/platform-admin");
  redirect("/platform-admin?owner-invited=yes");
}

export async function updatePlatformPropertyStatus(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const parsed = platformPropertyStatusSchema.safeParse({ propertyId: formData.get("propertyId"), status: formData.get("status"), reason: formData.get("reason"), confirmation: formData.get("confirmation") });
  if (!parsed.success) redirect("/platform-admin?property-error=invalid");
  try {
    await platformPropertyStatus.updateStatus(session.user.email, parsed.data);
  } catch (error) {
    if (error instanceof PlatformPropertyStatusError) redirect(`/platform-admin?property-error=${error.code.toLowerCase().replaceAll("_", "-")}`);
    throw error;
  }
  revalidatePath("/platform-admin");
  redirect(`/platform-admin?property-updated=${parsed.data.status.toLowerCase()}`);
}

export async function reviewDemoRequest(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["GRANT", "CLOSE"].includes(decision)) redirect("/platform-admin?demo-error=invalid");
  if (decision === "CLOSE") {
    const closed = await closeDemoRequest(requestId, session.user.email);
    if (!closed) redirect("/platform-admin?demo-error=unavailable");
    revalidatePath("/platform-admin");
    redirect("/platform-admin?demo-updated=closed");
  }

  const durationHours = Number(formData.get("durationHours"));
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 720) redirect("/platform-admin?demo-error=duration");
  const request = await claimDemoRequest(requestId, session.user.email);
  if (!request) redirect("/platform-admin?demo-error=unavailable");
  try {
    const invitationId = await createPlatformOwnerInvitation({
      email: request.email,
      ownerName: request.name,
      createdByEmail: session.user.email,
      demoDurationHours: durationHours,
    });
    await attachDemoInvitation(request.id, invitationId);
  } catch (error) {
    await releaseDemoRequest(request.id);
    if (error instanceof Error && error.message === "EMAIL_DELIVERY_FAILED") redirect("/platform-admin?demo-error=email");
    throw error;
  }
  revalidatePath("/platform-admin");
  redirect("/platform-admin?demo-updated=invited");
}
