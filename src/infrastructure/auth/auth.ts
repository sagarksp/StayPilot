import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";
import { sendEmail } from "@/infrastructure/email/smtp";

const secret = process.env.AUTH_SECRET;
const baseURL = process.env.APP_URL ?? "http://127.0.0.1:3000";

const trustedOrigins = new Set<string>();
function addTrustedOrigin(value: string | undefined, assumeHttps = false) {
  if (!value) return;
  try {
    const url = new URL(value.includes("://") ? value : `${assumeHttps ? "https" : "http"}://${value}`);
    trustedOrigins.add(url.origin);
  } catch {
    // Ignore malformed optional origin entries; Better Auth still validates requests.
  }
}

addTrustedOrigin(baseURL);
for (const origin of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
  addTrustedOrigin(origin.trim());
}
for (const origin of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
  addTrustedOrigin(origin, true);
}

// Local browsers often switch between localhost and 127.0.0.1. They are
// separate cookie hosts, but both are valid origins for the local auth API.
if (process.env.NODE_ENV !== "production") {
  try {
    const localURL = new URL(baseURL);
    if (localURL.hostname === "localhost" || localURL.hostname === "127.0.0.1") {
      const alternateHost = localURL.hostname === "localhost" ? "127.0.0.1" : "localhost";
      localURL.hostname = alternateHost;
      trustedOrigins.add(localURL.origin);
    }
  } catch {
    // The configured base URL is validated by Better Auth during startup.
  }
}

if (!secret || secret.length < 32) {
  throw new Error("AUTH_SECRET must be set to a value with at least 32 characters.");
}

export const auth = betterAuth({
  appName: "StayPilot",
  baseURL,
  trustedOrigins: [...trustedOrigins],
  secret,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  user: { modelName: "AuthIdentity" },
  session: { modelName: "AuthSession", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = new URL("/reset-password", baseURL);
      resetUrl.searchParams.set("token", token);
      const delivered = await sendEmail({
        to: user.email,
        subject: "Reset your StayPilot password",
        text: `Hello ${user.name},\n\nUse this link to choose a new StayPilot password. It expires in one hour and can only be used once:\n\n${resetUrl.href}\n\nIf you didn't request a password reset, you can ignore this email.`,
      });
      if (!delivered) {
        console.error("Gmail SMTP did not deliver a password reset email; the public response remains generic.");
      }
    },
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/request-password-reset": { window: 60, max: 4 },
    },
  },
});
