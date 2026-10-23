"use server";

import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/db/prisma";
import { isPlatformAdminEmail } from "@/infrastructure/auth/platform-admin-access";

export type PasswordRecoveryResult = "sent" | "first-admin" | "verify-admin" | "rate-limited" | "error";

export async function requestPasswordRecovery(emailInput: string): Promise<PasswordRecoveryResult> {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return "error";

  try {
    if (isPlatformAdminEmail(email)) {
      const identity = await prisma.authIdentity.findUnique({
        where: { email },
        select: { emailVerified: true },
      });

      if (!identity) return "first-admin";
      if (!identity.emailVerified) {
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: "/platform-admin" },
          headers: await headers(),
        });
        await auth.api.requestPasswordReset({
          body: { email },
          headers: await headers(),
        });
        return "verify-admin";
      }
    }

    await auth.api.requestPasswordReset({
      body: { email },
      headers: await headers(),
    });
    return "sent";
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : 0;
    if (status === 429) return "rate-limited";
    console.error("Password recovery request failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return "error";
  }
}

export type PlatformAdminBootstrapResult = "allowed" | "created" | "verification-sent" | "existing" | "not-allowed" | "invalid" | "error";

export async function authorizeFirstPlatformAdminSignup(emailInput: string): Promise<PlatformAdminBootstrapResult> {
  const email = emailInput.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "not-allowed";

  if (!isPlatformAdminEmail(email)) return "not-allowed";

  try {
    const existing = await prisma.authIdentity.findUnique({
      where: { email },
      select: { emailVerified: true },
    });
    if (existing) {
      if (existing.emailVerified) return "existing";
      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: "/platform-admin" },
        headers: await headers(),
      });
      return "verification-sent";
    }

    return "allowed";
  } catch (error) {
    console.error("First platform admin account setup failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return "error";
  }
}
