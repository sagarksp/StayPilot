"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { noticeUseCases } from "../application/use-cases";
import { publishNoticeSchema } from "../application/schemas";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function noticeUrl(orgId: string) {
  return `/org/${orgId}/notices`;
}

export async function publishNoticeAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const parsed = publishNoticeSchema.safeParse({
    propertyId: value(formData, "propertyId"),
    title: value(formData, "title"),
    body: value(formData, "body"),
    expiresOn: value(formData, "expiresOn"),
  });
  if (!parsed.success) redirect(`${noticeUrl(orgId)}?error=invalid`);
  try {
    await noticeUseCases.publish(actor, parsed.data);
  } catch (error) {
    if (error instanceof ZodError) redirect(`${noticeUrl(orgId)}?error=invalid`);
    if (error instanceof Error && error.message === "NOTICE_EXPIRY_IN_PAST") redirect(`${noticeUrl(orgId)}?error=expiry`);
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  revalidatePath(noticeUrl(orgId));
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`${noticeUrl(orgId)}?published=1`);
}

export async function archiveNoticeAction(formData: FormData) {
  const orgId = value(formData, "orgId");
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  try {
    await noticeUseCases.archive(actor, value(formData, "noticeId"));
  } catch (error) {
    if (error instanceof ZodError) redirect(`${noticeUrl(orgId)}?error=invalid`);
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  revalidatePath(noticeUrl(orgId));
  revalidatePath(`/org/${orgId}/resident`);
  redirect(`${noticeUrl(orgId)}?archived=1`);
}
