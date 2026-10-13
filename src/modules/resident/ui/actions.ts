"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentInvitationUseCases } from "@/infrastructure/auth/prisma-resident-invitations";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "../application";
import { ResidentWorkflowError } from "../domain/resident";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function cycle(formData: FormData): "MOVE_IN_DAY" | "FIXED_DAY" {
  return value(formData, "billingCycleType") === "FIXED_DAY" ? "FIXED_DAY" : "MOVE_IN_DAY";
}

function depositPolicy(formData: FormData): "FULL_MONTH" | "HALF_MONTH" | "FIXED" | "CUSTOM" {
  const policy = value(formData, "depositPolicyType");
  return policy === "FULL_MONTH" || policy === "HALF_MONTH" || policy === "CUSTOM" ? policy : "FIXED";
}

function paymentMethod(formData: FormData, key: string, fallback: "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "OTHER") {
  const method = value(formData, key);
  return method === "CASH" || method === "UPI" || method === "BANK_TRANSFER" || method === "CARD" || method === "OTHER" ? method : fallback;
}

function residentUrl(orgId: string, residentId?: string) {
  const base = `/org/${orgId}/residents`;
  return residentId ? `${base}/${residentId}` : base;
}

function workflowErrorCode(error: ResidentWorkflowError) {
  switch (error.code) {
    case "BED_UNAVAILABLE": return "bed-taken";
    case "FUTURE_MOVE_IN": return "future-date";
    case "FUTURE_MOVE_OUT": return "future-date";
    case "MOVE_OUT_BEFORE_MOVE_IN": return "date-order";
    case "ACTIVE_STAY_EXISTS": return "already-active";
    case "ACTIVE_RESERVATION_EXISTS": return "has-reservation";
    case "RESIDENT_EMAIL_TAKEN": return "email-taken";
    case "DEPOSIT_EXCEEDS_REQUIRED": return "deposit-limit";
    case "CHECKOUT_DRAFT_INVOICES": return "checkout-drafts";
    case "CHECKOUT_PAYMENT_MISMATCH": return "checkout-balance";
    case "CHECKOUT_DEDUCTION_EXCEEDS_BALANCE": return "checkout-deduction";
    case "NOTICE_PERIOD_TOO_SHORT": return "notice-short";
    case "LOCK_IN_ACTIVE": return "lock-in-active";
    case "MOVE_OUT_NOTICE_REQUIRED": return "notice-required";
    case "CHECKOUT_BEFORE_NOTICE_DATE": return "before-scheduled-date";
    case "NOTICE_ALREADY_EXISTS": return "notice-exists";
    case "DEPOSIT_TRANSFER_INVALID": return "transfer-account";
    case "DEPOSIT_TRANSFER_EXCEEDS_BALANCE": return "transfer-balance";
    case "DEPOSIT_TRANSFER_EXCEEDS_REQUIRED": return "transfer-limit";
    case "DEPOSIT_ACCOUNT_CHANGED": return "transfer-conflict";
    case "STAY_NOT_ACTIVE": return "stay-ended";
  }
}

function databaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function handleError(error: unknown, orgId: string, residentId?: string): never {
  const url = residentUrl(orgId, residentId);
  if (error instanceof ZodError) redirect(`${url}?error=invalid`);
  if (error instanceof ResidentWorkflowError) redirect(`${url}?error=${workflowErrorCode(error)}`);
  if (error instanceof AccessDeniedError || databaseErrorCode(error) === "P2025") notFound();
  throw error;
}

function refreshResidentViews(orgId: string, residentId?: string) {
  revalidatePath(`/org/${orgId}/owner`);
  revalidatePath(`/org/${orgId}/finance`);
  revalidatePath(`/org/${orgId}/payments`);
  revalidatePath(`/org/${orgId}/residents`);
  revalidatePath(`/org/${orgId}/properties`);
  revalidatePath(`/org/${orgId}/properties/[propertyId]`, "page");
  if (residentId) revalidatePath(residentUrl(orgId, residentId));
}

async function inviteResidentAfterMoveIn(actor: Awaited<ReturnType<typeof getOrganizationActor>>, residentId: string) {
  if (!actor) return false;
  try {
    await residentInvitationUseCases.issue(actor, residentId);
    return true;
  } catch {
    // The stay is already committed; invitation delivery or setup must not undo move-in.
    return false;
  }
}

export async function createResidentWithStayAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  let residentId: string;
  try {
    residentId = await residentUseCases.createResidentWithStay(actor, {
      name: value(formData, "name"),
      phone: value(formData, "phone"),
      email: value(formData, "email"),
      bedId: value(formData, "bedId"),
      startDate: value(formData, "startDate"),
      monthlyRent: value(formData, "monthlyRent"),
      billingCycleType: cycle(formData),
      billingDay: value(formData, "billingDay"),
      requiredSecurityDeposit: value(formData, "requiredSecurityDeposit"),
      depositPolicyType: depositPolicy(formData),
    });
  } catch (error) {
    handleError(error, orgId);
  }

  await inviteResidentAfterMoveIn(actor, residentId);
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function assignResidentBedAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await residentUseCases.assignBed(actor, residentId, {
      bedId: value(formData, "bedId"),
      startDate: value(formData, "startDate"),
      monthlyRent: value(formData, "monthlyRent"),
      billingCycleType: cycle(formData),
      billingDay: value(formData, "billingDay"),
      requiredSecurityDeposit: value(formData, "requiredSecurityDeposit"),
      depositPolicyType: depositPolicy(formData),
    });
  } catch (error) {
    handleError(error, orgId, residentId);
  }

  await inviteResidentAfterMoveIn(actor, residentId);
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function updateResidentEmailAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await residentUseCases.updateResidentEmail(actor, residentId, value(formData, "email"));
  } catch (error) {
    handleError(error, orgId, residentId);
  }
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function setResidentRentTermsAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await residentUseCases.setRentTerms(actor, residentId, value(formData, "stayId"), {
      monthlyRent: value(formData, "monthlyRent"),
      billingCycleType: cycle(formData),
      billingDay: value(formData, "billingDay"),
    });
  } catch (error) {
    handleError(error, orgId, residentId);
  }
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function recordSecurityDepositReceiptAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await residentUseCases.recordSecurityDepositReceipt(actor, residentId, value(formData, "stayId"), {
      amount: value(formData, "amount"), paymentDate: value(formData, "paymentDate"),
      method: paymentMethod(formData, "method", "UPI"),
      reference: value(formData, "reference"),
    });
  } catch (error) { handleError(error, orgId, residentId); }
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function checkOutResidentAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await residentUseCases.checkOut(actor, residentId, {
      stayId: value(formData, "stayId"),
      endDate: value(formData, "endDate"),
      paymentDate: value(formData, "paymentDate"),
      additionalPayment: value(formData, "additionalPayment"),
      additionalPaymentMethod: paymentMethod(formData, "additionalPaymentMethod", "CASH"),
      damageDeduction: value(formData, "damageDeduction"),
      damageReason: value(formData, "damageReason"),
      depositRefundMethod: paymentMethod(formData, "depositRefundMethod", "UPI"),
      reference: value(formData, "reference"),
    });
  } catch (error) {
    handleError(error, orgId, residentId);
  }

  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function recordMoveOutNoticeAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await residentUseCases.recordMoveOutNotice(actor, {
      stayId: value(formData, "stayId"),
      requestedCheckoutDate: value(formData, "requestedCheckoutDate"),
      lockInOverrideReason: value(formData, "lockInOverrideReason"),
    });
  } catch (error) {
    handleError(error, orgId, residentId);
  }
  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}

export async function submitResidentMoveOutNoticeAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const portalUrl = `/org/${orgId}/resident`;
  try {
    await residentUseCases.recordMoveOutNotice(actor, {
      stayId: value(formData, "stayId"),
      requestedCheckoutDate: value(formData, "requestedCheckoutDate"),
      lockInOverrideReason: "",
    });
  } catch (error) {
    if (error instanceof ZodError) redirect(`${portalUrl}?error=invalid-notice`);
    if (error instanceof ResidentWorkflowError) {
      const code = error.code === "NOTICE_PERIOD_TOO_SHORT" ? "notice-too-short"
        : error.code === "LOCK_IN_ACTIVE" ? "lock-in-active"
        : error.code === "NOTICE_ALREADY_EXISTS" ? "notice-exists"
        : error.code === "FUTURE_MOVE_OUT" ? "invalid-notice-date"
        : "notice-unavailable";
      redirect(`${portalUrl}?error=${code}`);
    }
    if (error instanceof AccessDeniedError || databaseErrorCode(error) === "P2025") notFound();
    throw error;
  }
  revalidatePath(portalUrl);
  revalidatePath(`/org/${orgId}/residents`);
  redirect(portalUrl);
}

export async function transferSecurityDepositAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const url = `/org/${orgId}/deposit-transfers`;
  try {
    await residentUseCases.transferSecurityDeposit(actor, {
      sourceStayId: value(formData, "sourceStayId"),
      destinationStayId: value(formData, "destinationStayId"),
      amount: value(formData, "amount"),
      reason: value(formData, "reason"),
    });
  } catch (error) {
    if (error instanceof ZodError) redirect(`${url}?error=invalid-transfer`);
    if (error instanceof ResidentWorkflowError) redirect(`${url}?error=${workflowErrorCode(error)}`);
    if (error instanceof AccessDeniedError || databaseErrorCode(error) === "P2025") notFound();
    throw error;
  }
  revalidatePath(url);
  revalidatePath(`/org/${orgId}/resident`);
  refreshResidentViews(orgId);
  redirect(`${url}?transferred=1`);
}
