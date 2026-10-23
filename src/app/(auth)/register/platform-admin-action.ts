"use server";

import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/db/prisma";
import { isPlatformAdminEmail } from "@/infrastructure/auth/platform-admin-access";

export type PlatformAdminRegistrationResult =
  | { status: "created" }
  | { status: "verification-sent" }
  | { status: "existing" }
  | { status: "not-allowed" }
  | { status: "invalid" }
  | { status: "error" };

export async function registerPlatformAdminAccount(
  formData: FormData,
): Promise<PlatformAdminRegistrationResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (
    name.length < 2 ||
    name.length > 180 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return { status: "invalid" };
  }

  if (!isPlatformAdminEmail(email)) return { status: "not-allowed" };

  const existing = await prisma.authIdentity.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  try {
    if (existing) {
      if (existing.emailVerified) return { status: "existing" };

      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: "/platform-admin" },
        headers: await headers(),
      });
      return { status: "verification-sent" };
    }

    await auth.api.signUpEmail({
      body: { name, email, password, callbackURL: "/platform-admin" },
      headers: await headers(),
    });
    return { status: "created" };
  } catch (error) {
    console.error("Platform admin account setup failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error" };
  }
}
