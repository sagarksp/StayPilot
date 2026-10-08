"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "../domain/inventory";
import { propertyUseCases } from "../application";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberOrNull(input: string) {
  if (!input) return null;
  const number = Number(input);
  return Number.isInteger(number) ? number : Number.NaN;
}

function editUrl(orgId: string, propertyId?: string) {
  const base = `/org/${orgId}/properties`;
  return propertyId ? `${base}/${propertyId}` : `${base}/new`;
}

function databaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function handleActionError(error: unknown, orgId: string, propertyId?: string): never {
  const url = editUrl(orgId, propertyId);
  if (error instanceof ZodError) redirect(`${url}?error=invalid`);
  if (databaseErrorCode(error) === "P2002") redirect(`${url}?error=duplicate`);
  if (error instanceof AccessDeniedError || databaseErrorCode(error) === "P2025") notFound();
  throw error;
}

export async function createPropertyAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  let property;
  try {
    property = await propertyUseCases.createProperty(actor, {
      name: value(formData, "name"),
      code: value(formData, "code"),
      addressLine1: value(formData, "addressLine1"),
      addressLine2: value(formData, "addressLine2"),
      city: value(formData, "city"),
      state: value(formData, "state"),
      postalCode: value(formData, "postalCode"),
      contactPhone: value(formData, "contactPhone"),
      contactEmail: value(formData, "contactEmail"),
    });
  } catch (error) {
    handleActionError(error, orgId);
  }

  revalidatePath(`/org/${orgId}/properties`);
  redirect(editUrl(orgId, property.id));
}

export async function createFloorAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const propertyId = value(formData, "propertyId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await propertyUseCases.createFloor(actor, propertyId, {
      name: value(formData, "name"),
      number: numberOrNull(value(formData, "number")),
    });
  } catch (error) {
    handleActionError(error, orgId, propertyId);
  }
  revalidatePath(editUrl(orgId, propertyId));
  redirect(editUrl(orgId, propertyId));
}

export async function createRoomAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const propertyId = value(formData, "propertyId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await propertyUseCases.createRoom(actor, propertyId, {
      floorId: value(formData, "floorId"),
      number: value(formData, "number"),
    });
  } catch (error) {
    handleActionError(error, orgId, propertyId);
  }
  revalidatePath(editUrl(orgId, propertyId));
  redirect(editUrl(orgId, propertyId));
}

export async function createBedAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const propertyId = value(formData, "propertyId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  try {
    await propertyUseCases.createBed(actor, propertyId, {
      roomId: value(formData, "roomId"),
      label: value(formData, "label"),
    });
  } catch (error) {
    handleActionError(error, orgId, propertyId);
  }
  revalidatePath(editUrl(orgId, propertyId));
  redirect(editUrl(orgId, propertyId));
}
