import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured before using the database.");
}

const databaseUrl = new URL(connectionString);
if (["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) && !databaseUrl.searchParams.has("allowPublicKeyRetrieval")) {
  // Local MySQL 8 commonly uses caching_sha2_password without TLS. Keep RSA
  // key retrieval limited to loopback; remote databases should use TLS or a
  // configured server public key instead.
  databaseUrl.searchParams.set("allowPublicKeyRetrieval", "true");
}

const adapter = new PrismaMariaDb(databaseUrl.toString());
const globalForPrisma = globalThis as typeof globalThis & {
  stayPilotPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.stayPilotPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.stayPilotPrisma = prisma;
}
