"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { createPollSchema, foodMenuSchema, mealTypesSchema, updateFoodMenuSchema, voteSchema } from "../application/schemas";
import { foodUseCases } from "../application/use-cases";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function localDateTimeToIso(value: string, timezone: string) {
  const [date, time] = value.split("T");
  if (!date || !time) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wantedUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(wantedUtc));
  const actual = Object.fromEntries(parts.map(({ type, value: part }) => [type, Number(part)]));
  const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
  return new Date(wantedUtc - (actualUtc - wantedUtc)).toISOString();
}

async function actorFor(orgId: string) {
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  return actor;
}

function errorRedirect(orgId: string, error: unknown, target = "food"): never {
  if (error instanceof AccessDeniedError) notFound();
  const known = ["DUPLICATE_MEAL_TYPE", "INVALID_POLL_TIME", "INVALID_MEAL_TYPE", "FOOD_POLL_ALREADY_EXISTS", "FOOD_POLL_NOT_OPEN", "POLL_CLOSED", "INVALID_POLL_OPTION", "FOOD_MENU_NOT_FOUND", "FOOD_MENU_LOCKED", "MENU_ITEM_OUTSIDE_RANGE", "DUPLICATE_MENU_ITEM"];
  if (error instanceof Error && known.includes(error.message)) redirect(`/org/${orgId}/${target}?food-error=${error.message.toLowerCase().replaceAll("_", "-")}`);
  throw error;
}

async function menuInput(form: FormData, orgId: string, update: boolean) {
  const actor = await actorFor(orgId);
  const propertyId = value(form, "propertyId");
  let mealTypes;
  try { mealTypes = await foodUseCases.listMealTypes(actor, propertyId); } catch (error) { errorRedirect(orgId, error); }
  const mealTypeIds = new Set(mealTypes.map((mealType) => mealType.publicId));
  let rows: unknown = null;
  try { rows = JSON.parse(value(form, "itemsJson")); } catch { /* The schema below reports malformed menu rows. */ }
  const items = Array.isArray(rows) ? rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const item = row as Record<string, unknown>;
    const mealTypeId = typeof item.mealTypeId === "string" ? item.mealTypeId : "";
    return { date: item.date, mealTypeId: mealTypeIds.has(mealTypeId) ? mealTypeId : "", dishName: item.dishName, description: item.description };
  }) : rows;
  const input = { propertyId, title: value(form, "title"), validFrom: value(form, "validFrom"), validTo: value(form, "validTo"), items, ...(update ? { menuId: value(form, "menuId") } : {}) };
  return { actor, input };
}

export async function createFoodMenuAction(form: FormData) {
  const orgId = value(form, "orgId");
  const { actor, input } = await menuInput(form, orgId, false);
  const parsed = foodMenuSchema.safeParse(input);
  if (!parsed.success) redirect(`/org/${orgId}/food?food-error=invalid-menu`);
  try { await foodUseCases.createMenu(actor, parsed.data); } catch (error) { errorRedirect(orgId, error); }
  revalidatePath(`/org/${orgId}/food`);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/food?menu-published=1`);
}

export async function updateFoodMenuAction(form: FormData) {
  const orgId = value(form, "orgId");
  const { actor, input } = await menuInput(form, orgId, true);
  const parsed = updateFoodMenuSchema.safeParse(input);
  if (!parsed.success) redirect(`/org/${orgId}/food?food-error=invalid-menu`);
  try { await foodUseCases.updateMenu(actor, parsed.data); } catch (error) { errorRedirect(orgId, error); }
  revalidatePath(`/org/${orgId}/food`);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/food?menu-updated=1`);
}

export async function replaceFoodMealTypesAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = mealTypesSchema.safeParse({ propertyId: value(form, "propertyId"), mealTypes: value(form, "mealTypes").split(/\r?\n/).map((name) => name.trim()).filter(Boolean) });
  if (!parsed.success) redirect(`/org/${orgId}/food?food-error=invalid-input`);
  try { await foodUseCases.replaceMealTypes(await actorFor(orgId), parsed.data); } catch (error) { errorRedirect(orgId, error); }
  revalidatePath(`/org/${orgId}/food`);
  redirect(`/org/${orgId}/food?meal-types-saved=1`);
}

export async function createFoodPollAction(form: FormData) {
  const orgId = value(form, "orgId");
  const actor = await actorFor(orgId);
  const mealDate = value(form, "mealDate");
  const date = new Date(`${mealDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== mealDate) redirect(`/org/${orgId}/food?food-error=invalid-input`);
  date.setUTCDate(date.getUTCDate() - 1);
  const closesAt = localDateTimeToIso(`${date.toISOString().slice(0, 10)}T23:59`, actor.organizationTimezone);
  const customOptions = value(form, "options");
  const options = customOptions ? customOptions.split(/\r?\n/).map((option) => option.trim()).filter(Boolean) : ["I will eat", "I will not eat"];
  const parsed = createPollSchema.safeParse({ propertyId: value(form, "propertyId"), mealTypeId: value(form, "mealTypeId"), mealDate, closesAt, options });
  if (!parsed.success) redirect(`/org/${orgId}/food?food-error=invalid-input`);
  try { await foodUseCases.createPoll(actor, parsed.data); } catch (error) { errorRedirect(orgId, error); }
  revalidatePath(`/org/${orgId}/food`);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/food?poll-created=1`);
}

export async function closeFoodPollAction(form: FormData) {
  const orgId = value(form, "orgId");
  try { await foodUseCases.closePoll(await actorFor(orgId), value(form, "pollId")); } catch (error) { errorRedirect(orgId, error); }
  revalidatePath(`/org/${orgId}/food`);
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/food?poll-closed=1`);
}

export async function voteFoodPollAction(form: FormData) {
  const orgId = value(form, "orgId");
  const parsed = voteSchema.safeParse({ pollId: value(form, "pollId"), optionId: value(form, "optionId") });
  if (!parsed.success) redirect(`/org/${orgId}/resident?food-error=invalid-vote`);
  try { await foodUseCases.vote(await actorFor(orgId), parsed.data); } catch (error) { errorRedirect(orgId, error, "resident"); }
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`/org/${orgId}/resident?food-voted=1`);
}
