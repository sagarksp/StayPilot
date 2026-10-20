import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { foodUseCases } from "@/modules/food/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type Context = Readonly<{ params: Promise<{ orgId: string }> }>;

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export async function GET(request: Request, { params }: Context) {
  const { orgId } = await params;
  const propertyId = new URL(request.url).searchParams.get("propertyId");
  if (!propertyId) return Response.json({ error: "PROPERTY_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const [page, propertyPolls] = await Promise.all([
      foodUseCases.getStaffPage(actor),
      foodUseCases.listManagerPolls(actor, propertyId),
    ]);
    const property = page.properties.find((entry) => entry.publicId === propertyId);
    const forecast = property && page.attendance.find((entry) => entry.propertyId === property.id);
    if (!property || !forecast) return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });

    const lines = [["Record type", "Property", "Date", "Residents", "Away", "Expected portions", "Meal type", "Poll option", "Votes", "Anonymous suggestions"].map(csvCell).join(",")];
    for (const day of forecast.days) {
      const date = day.date.toISOString().slice(0, 10);
      lines.push(["Attendance", property.name, date, day.totalResidents, day.awayResidents, day.expectedMeals, "", "", "", ""].map(csvCell).join(","));
      const dayPolls = propertyPolls.filter((poll) => poll.mealDate.toISOString().slice(0, 10) === date);
      for (const poll of dayPolls) {
        for (const option of poll.options) {
          lines.push(["Poll result", property.name, date, "", "", "", poll.mealType.name, option.label, option._count.votes, option.suggestions.join(" | ")].map(csvCell).join(","));
        }
      }
    }
    const filename = `food-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(`${lines.join("\r\n")}\r\n`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
