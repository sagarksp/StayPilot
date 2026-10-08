"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { auth } from "@/infrastructure/auth/auth";
import { prismaOrganizationSetup } from "@/infrastructure/auth/prisma-organization-setup";
import { createOrganizationSetup } from "@/modules/auth/application/setup-organization";

const setupOrganization = createOrganizationSetup(prismaOrganizationSetup);

export async function createOrganizationAction(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) redirect("/login");

  try {
    const organizationId = await setupOrganization({
      email: session.user.email,
      ownerName: session.user.name,
      organizationName: String(formData.get("name") ?? ""),
    });
    redirect(`/org/${organizationId}/properties/new`);
  } catch (error) {
    if (error instanceof ZodError) redirect("/setup?error=invalid");
    throw error;
  }
}
