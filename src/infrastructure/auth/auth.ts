import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";

const secret = process.env.AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("AUTH_SECRET must be set to a value with at least 32 characters.");
}

export const auth = betterAuth({
  appName: "StayPilot",
  baseURL: process.env.APP_URL ?? "http://localhost:3000",
  secret,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  user: { modelName: "AuthIdentity" },
  session: { modelName: "AuthSession", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
    },
  },
});
