"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { billSchema, electricitySettingsSchema, meterSchema, meterStatusSchema, overrideSchema, readingSchema } from "../application/schemas";
import { electricityUseCases } from "../application/use-cases";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
function parseFailure(orgId: string): never { redirect(`/org/${orgId}/electricity?error=invalid-input`); }
async function actorFor(orgId: string) {
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  return actor;
}
function handleError(error: unknown, orgId: string): never {
  if (error instanceof AccessDeniedError) notFound();
  const known = ["INVALID_METER_SCOPE", "METER_CHANGED", "DUPLICATE_MANUAL_BILL", "READING_NOT_MONOTONIC", "INVALID_BILL_AMOUNT", "METER_READINGS_REQUIRED", "INVALID_METER", "INVALID_READING_RANGE", "BILL_NOT_DRAFT", "NO_RESIDENTS_IN_PERIOD", "ALLOCATION_NOT_EDITABLE", "BILL_NEEDS_ALLOCATIONS", "OVERRIDE_REASON_REQUIRED", "ALLOCATION_TOTAL_MISMATCH"];
  if (error instanceof Error && known.includes(error.message)) redirect(`/org/${orgId}/electricity?error=${error.message.toLowerCase().replaceAll("_", "-")}`);
  throw error;
}
function done(orgId: string, message: string): never {
  revalidatePath(`/org/${orgId}/electricity`);
  revalidatePath(`/org/${orgId}/finance`);
  revalidatePath(`/org/${orgId}/owner`);
  redirect(`/org/${orgId}/electricity?${message}=1`);
}

export async function createElectricityMeterAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = meterSchema.safeParse({ propertyId: value(form, "propertyId"), scopeType: value(form, "scopeType"), scopeId: value(form, "scopeId"), meterNumber: value(form, "meterNumber"), installedOn: value(form, "installedOn") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.createMeter(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "meter-created");
}

export async function updateElectricitySettingsAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = electricitySettingsSchema.safeParse({ propertyId: value(form, "propertyId"), electricityMode: value(form, "electricityMode"), defaultUnitRate: value(form, "defaultUnitRate") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.updateSettings(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "settings-updated");
}

export async function recordElectricityReadingAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = readingSchema.safeParse({ meterId: value(form, "meterId"), readingValue: value(form, "readingValue"), readingAt: value(form, "readingAt") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.recordReading(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "reading-recorded");
}

export async function retireElectricityMeterAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = meterStatusSchema.safeParse({ meterId: value(form, "meterId"), status: value(form, "status") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.retireMeter(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "meter-retired");
}

export async function createElectricityBillAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = billSchema.safeParse({ propertyId: value(form, "propertyId"), billingMode: value(form, "billingMode"), meterId: value(form, "meterId"), previousReadingId: value(form, "previousReadingId"), currentReadingId: value(form, "currentReadingId"), periodStart: value(form, "periodStart"), periodEnd: value(form, "periodEnd"), unitRate: value(form, "unitRate"), totalAmount: value(form, "totalAmount") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.createBill(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "bill-created");
}

export async function calculateElectricityAllocationsAction(form: FormData) {
  const orgId = value(form, "orgId"), billId = value(form, "billId");
  try { await electricityUseCases.calculateAllocations(await actorFor(orgId), billId); } catch (error) { handleError(error, orgId); }
  done(orgId, "allocations-calculated");
}

export async function overrideElectricityAllocationAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = overrideSchema.safeParse({ allocationId: value(form, "allocationId"), amount: value(form, "amount"), reason: value(form, "reason") });
  if (!parsed.success) parseFailure(orgId);
  try { await electricityUseCases.overrideAllocation(await actorFor(orgId), parsed.data); } catch (error) { handleError(error, orgId); }
  done(orgId, "allocation-updated");
}

export async function finalizeElectricityBillAction(form: FormData) {
  const orgId = value(form, "orgId"), billId = value(form, "billId");
  try { await electricityUseCases.finalizeBill(await actorFor(orgId), billId); } catch (error) { handleError(error, orgId); }
  done(orgId, "bill-finalized");
}
