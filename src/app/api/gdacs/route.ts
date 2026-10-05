import { apiError, isIsoDate, pointFromGeometry } from "@/utils/server-data";

export const dynamic = "force-dynamic";

type GdacsFeature = { id?: string | number; geometry?: unknown; properties?: Record<string, unknown> };

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const requestedStart = query.get("start");
  const requestedEnd = query.get("end");
  const today = new Date();
  const end = requestedEnd ?? today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = requestedStart ?? defaultStart;
  if (!isIsoDate(start) || !isIsoDate(end) || start > end) return apiError("GDACS", "A valid date range is required.", 400);

  const params = new URLSearchParams({ eventlist: "EQ;TC;FL;VO;DR;WF", fromdate: start, todate: end });
  try {
    const response = await fetch(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${params}`, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 600 },
    });
    if (!response.ok) return apiError("GDACS", "GDACS event feed is temporarily unavailable.");
    const payload = (await response.json()) as { features?: GdacsFeature[] };
    const events = (payload.features ?? []).map((feature) => {
      const properties = feature.properties ?? {};
      const url = properties.url;
      const urlRecord = typeof url === "object" && url !== null ? (url as Record<string, unknown>) : {};
      const countryName = stringValue(properties.country) ?? stringValue(properties.name);
      return {
        id: String(properties.eventid ?? feature.id ?? "gdacs-event"),
        title: stringValue(properties.name) ?? stringValue(properties.eventname) ?? "GDACS event",
        eventType: stringValue(properties.eventtype) ?? "Hazard",
        alertLevel: stringValue(properties.alertlevel),
        date: stringValue(properties.fromdate) ?? stringValue(properties.todate),
        coordinates: pointFromGeometry(feature.geometry),
        country: countryName,
        url: stringValue(urlRecord.report) ?? stringValue(urlRecord.details) ?? stringValue(properties.urlreport),
      };
    });
    return Response.json({
      source: "GDACS",
      classification: "OBSERVED",
      fetchedAt: new Date().toISOString(),
      count: events.length,
      events,
      limitation: "GDACS event types and alert levels retain the source's own coverage and meaning.",
    });
  } catch {
    return apiError("GDACS", "GDACS event feed is temporarily unavailable.");
  }
}
