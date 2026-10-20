import { timingSafeEqual } from "node:crypto";
import { notificationUseCases } from "@/modules/notification/application/use-cases";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret ?? "");
  if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const created = await notificationUseCases.generateDueReminders();
  return Response.json({ data: { createdNotifications: created } });
}
