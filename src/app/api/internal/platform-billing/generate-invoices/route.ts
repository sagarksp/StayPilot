import { timingSafeEqual } from "node:crypto";
import { generatePlatformInvoices } from "@/infrastructure/platform-admin/prisma-platform-billing";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret ?? "");
  if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  try {
    const created = await generatePlatformInvoices(period);
    return Response.json({ data: { period, createdInvoices: created } });
  } catch (error) {
    if (error instanceof Error && error.message === "PRICING_NOT_CONFIGURED") {
      return Response.json({ error: "PRICING_NOT_CONFIGURED" }, { status: 409 });
    }
    throw error;
  }
}
