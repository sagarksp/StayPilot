"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "../application";
import { ResidentWorkflowError } from "../domain/resident";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function cycle(formData: FormData): "MOVE_IN_DAY" | "FIXED_DAY" {
  return value(formData, "billingCycleType") === "FIXED_DAY" ? "FIXED_DAY" : "MOVE_IN_DAY";
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
  revalidatePath(`/org/${orgId}/residents`);
  revalidatePath(`/org/${orgId}/properties`);
  revalidatePath(`/org/${orgId}/properties/[propertyId]`, "page");
  if (residentId) revalidatePath(residentUrl(orgId, residentId));
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
    });
  } catch (error) {
    handleError(error, orgId);
  }

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
    });
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

export async function checkOutResidentAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const residentId = value(formData, "residentId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await residentUseCases.checkOut(actor, residentId, {
      stayId: value(formData, "stayId"),
      endDate: value(formData, "endDate"),
    });
  } catch (error) {
    handleError(error, orgId, residentId);
  }

  refreshResidentViews(orgId, residentId);
  redirect(residentUrl(orgId, residentId));
}
