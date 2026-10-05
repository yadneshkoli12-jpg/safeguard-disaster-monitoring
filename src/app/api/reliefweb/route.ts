import { apiError } from "@/utils/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const appname = process.env.RELIEFWEB_APPNAME?.trim();
  if (!appname) {
    return Response.json({
      source: "ReliefWeb",
      error: "Humanitarian reports unavailable: a pre-approved RELIEFWEB_APPNAME is not configured.",
      reports: [],
    }, { status: 503 });
  }

  const url = new URL("https://api.reliefweb.int/v2/reports");
  url.searchParams.set("appname", appname);
  url.searchParams.set("limit", "6");
  url.searchParams.append("sort[]", "date:desc");
  for (const field of ["title", "date", "url", "country"]) url.searchParams.append("fields[include][]", field);

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000), next: { revalidate: 1800 } });
    if (!response.ok) return apiError("ReliefWeb", "Humanitarian reports are temporarily unavailable or the configured app name is not approved.");
    const payload = (await response.json()) as {
      data?: { id?: number; fields?: { title?: string; date?: { created?: string; original?: string }; url?: string; country?: { name?: string }[] } }[];
    };
    const reports = (payload.data ?? []).map((item) => ({
      id: String(item.id ?? "report"),
      title: item.fields?.title ?? "Humanitarian report",
      date: item.fields?.date?.created ?? item.fields?.date?.original ?? null,
      url: item.fields?.url ?? null,
      countries: (item.fields?.country ?? []).map((country) => country.name).filter((name): name is string => Boolean(name)),
    }));
    return Response.json({ source: "ReliefWeb · Humanitarian Report", fetchedAt: new Date().toISOString(), reports });
  } catch {
    return apiError("ReliefWeb", "Humanitarian reports are temporarily unavailable.");
  }
}
