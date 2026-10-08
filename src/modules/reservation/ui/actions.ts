"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { reservationUseCases } from "../application";
import { ReservationWorkflowError } from "../domain/reservation";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const billingCycle = (formData: FormData): "MOVE_IN_DAY" | "FIXED_DAY" => value(formData, "billingCycleType") === "FIXED_DAY" ? "FIXED_DAY" : "MOVE_IN_DAY";
const listUrl = (orgId: string) => `/org/${orgId}/reservations`;
function errorCode(error: ReservationWorkflowError) {
  switch (error.code) {
    case "BED_UNAVAILABLE": return "bed-unavailable";
    case "ACTIVE_RESERVATION_EXISTS": return "resident-reserved";
    case "RESIDENT_HAS_ACTIVE_STAY": return "resident-active";
    case "RESERVATION_START_IN_PAST": return "start-past";
    case "MOVE_IN_OUTSIDE_RESERVATION": return "move-in-range";
    case "MOVE_IN_IN_FUTURE": return "move-in-future";
    case "RESERVATION_NOT_ACTIVE": return "not-active";
    case "DATE_ORDER": return "date-order";
    default: return "invalid";
  }
}
function handle(error: unknown, orgId: string): never {
  if (error instanceof ZodError) redirect(`${listUrl(orgId)}?error=invalid`);
  if (error instanceof ReservationWorkflowError) redirect(`${listUrl(orgId)}?error=${errorCode(error)}`);
  if (error instanceof AccessDeniedError) notFound();
  throw error;
}
function refresh(orgId: string) {
  revalidatePath(listUrl(orgId));
  revalidatePath(`/org/${orgId}/owner`);
  revalidatePath(`/org/${orgId}/residents`);
  revalidatePath(`/org/${orgId}/properties`);
}

export async function createReservationAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await reservationUseCases.createReservation(actor, {
      residentId: value(formData, "residentId"), bedId: value(formData, "bedId"),
      newResidentName: value(formData, "newResidentName"), newResidentPhone: value(formData, "newResidentPhone"), newResidentEmail: value(formData, "newResidentEmail"),
      reservationStartDate: value(formData, "reservationStartDate"), reservationEndDate: value(formData, "reservationEndDate"),
      expectedMoveInDate: value(formData, "expectedMoveInDate"), notes: value(formData, "notes"),
    });
  } catch (error) { handle(error, orgId); }
  refresh(orgId);
  redirect(listUrl(orgId));
}

export async function cancelReservationAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try { await reservationUseCases.cancelReservation(actor, value(formData, "reservationId"), value(formData, "reason")); }
  catch (error) { handle(error, orgId); }
  refresh(orgId);
  redirect(listUrl(orgId));
}

export async function moveInReservationAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try { await reservationUseCases.moveIn(actor, value(formData, "reservationId"), value(formData, "moveInDate"), {
    monthlyRent: value(formData, "monthlyRent"),
    billingCycleType: billingCycle(formData),
    billingDay: value(formData, "billingDay"),
  }); }
  catch (error) { handle(error, orgId); }
  refresh(orgId);
  redirect(listUrl(orgId));
}
