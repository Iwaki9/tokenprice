import { isAdmin } from "@/lib/auth";
import { readClicks } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const clicks = await readClicks();
  const header = "slug,at,from,country,user_agent";
  const lines = clicks.map((click) =>
    [
      click.slug,
      click.at,
      click.ref ?? "",
      click.country ?? "",
      (click.ua ?? "").replace(/"/g, "'"),
    ]
      .map((value) => `"${String(value)}"`)
      .join(","),
  );

  return new Response([header, ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tokenrate-clicks-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
