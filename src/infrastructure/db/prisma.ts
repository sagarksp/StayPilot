import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured before using the database.");
}

const adapter = new PrismaMariaDb(connectionString);
const globalForPrisma = globalThis as typeof globalThis & {
  stayPilotPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.stayPilotPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.stayPilotPrisma = prisma;
}
