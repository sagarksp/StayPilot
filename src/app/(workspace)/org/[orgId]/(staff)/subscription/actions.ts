"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/infrastructure/auth/auth";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { prisma } from "@/infrastructure/db/prisma";
import { submitPlatformPayment } from "@/infrastructure/platform-admin/prisma-platform-billing";

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().trim().max(180).optional(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional(),
});

export async function submitOwnerPlatformPayment(orgId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) redirect("/login");
  const actor = await getOrganizationActor(orgId);
  if (!actor?.roles.includes("OWNER")) notFound();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || Number(parsed.data.amount) <= 0) redirect(`/org/${orgId}/subscription?error=invalid`);
  const organization = await prisma.organization.findUnique({ where: { publicId: orgId }, select: { id: true } });
  if (!organization) notFound();
  try {
    await submitPlatformPayment({
      ...parsed.data,
      organizationId: organization.id,
      email: session.user.email,
      reference: parsed.data.reference || null,
      paidAt: new Date(`${parsed.data.paidAt}T12:00:00.000Z`),
      note: parsed.data.note || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_UNAVAILABLE") redirect(`/org/${orgId}/subscription?error=invoice-unavailable`);
    if (error instanceof Error && error.message === "AMOUNT_EXCEEDS_BALANCE") redirect(`/org/${orgId}/subscription?error=amount-exceeds-balance`);
    throw error;
  }
  revalidatePath(`/org/${orgId}/subscription`);
  revalidatePath("/platform-admin");
  redirect(`/org/${orgId}/subscription?submitted=yes`);
}
