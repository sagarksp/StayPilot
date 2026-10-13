"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "../application";
import { ComplaintWorkflowError, type ComplaintCategory, type ComplaintStatus } from "../domain/complaint";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function complaintError(error: ComplaintWorkflowError) {
  switch (error.code) {
    case "STAY_NOT_ACTIVE": return "no-active-stay";
    case "COMPLAINT_NOT_FOUND": return "not-found";
    case "INVALID_STATUS_TRANSITION": return "invalid-transition";
    case "ASSIGNEE_NOT_ALLOWED": return "invalid-assignee";
    case "RESOLUTION_NOTE_REQUIRED": return "resolution-note-required";
  }
}

export async function createComplaintAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const portalUrl = `/org/${orgId}/resident`;
  try {
    const category = value(formData, "category");
    await complaintUseCases.createForResident(actor, {
      stayId: value(formData, "stayId"),
      category: category as ComplaintCategory,
      title: value(formData, "title"),
      description: value(formData, "description"),
    });
  } catch (error) {
    if (error instanceof ZodError) redirect(`${portalUrl}?complaint-error=invalid`);
    if (error instanceof ComplaintWorkflowError) redirect(`${portalUrl}?complaint-error=${complaintError(error)}`);
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  revalidatePath(portalUrl);
  revalidatePath(`/org/${orgId}/complaints`);
  redirect(`${portalUrl}?complaint-created=1`);
}

export async function updateComplaintAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const complaintsUrl = `/org/${orgId}/complaints`;
  try {
    const status = value(formData, "status");
    const category = value(formData, "category");
    await complaintUseCases.updateForStaff(actor, {
      complaintId: value(formData, "complaintId"),
      status: status ? status as ComplaintStatus : undefined,
      assignedToId: value(formData, "assignedToId"),
      resolutionNote: value(formData, "resolutionNote"),
      category: category ? category as ComplaintCategory : undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) redirect(`${complaintsUrl}?error=invalid`);
    if (error instanceof ComplaintWorkflowError) redirect(`${complaintsUrl}?error=${complaintError(error)}`);
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  revalidatePath(complaintsUrl);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(complaintsUrl);
}
