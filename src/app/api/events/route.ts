import { apiError, isIsoDate, pointFromCoordinates } from "@/utils/server-data";

export const dynamic = "force-dynamic";

const categories = new Set(["wildfires", "severeStorms", "volcanoes", "floods", "landslides", "drought", "dustHaze", "snow", "seaLakeIce", "waterColor", "tempExtremes", "earthquakes"]);

type EonetGeometry = { date?: string; type?: string; coordinates?: unknown };
type EonetEvent = {
  id?: string | number;
  title?: string;
  description?: string;
  link?: string;
  categories?: { id?: string; title?: string }[];
  sources?: { id?: string; url?: string; source?: string }[];
  geometry?: EonetGeometry[] | EonetGeometry | null;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const historical = query.get("status") === "all";
  const category = query.get("category") ?? "all";
  if (category !== "all" && !categories.has(category)) return apiError("NASA EONET", "Unsupported EONET category.", 400);

  const params = new URLSearchParams({ status: historical ? "all" : "open", limit: historical ? "500" : "120" });
  if (historical) {
    const start = query.get("start");
    const end = query.get("end");
    const latitudeValue = query.get("latitude");
    const longitudeValue = query.get("longitude");
    if (!latitudeValue || !longitudeValue) return apiError("NASA EONET", "A valid location is required for the historical query.", 400);
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (!isIsoDate(start) || !isIsoDate(end) || start > end) return apiError("NASA EONET", "A valid historical date range is required.", 400);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return apiError("NASA EONET", "A valid location is required for the historical query.", 400);
    }
    const latitudeSpan = 500 / 111;
    const longitudeSpan = Math.min(180, 500 / (111 * Math.max(0.08, Math.cos((latitude * Math.PI) / 180))));
    const minLongitude = Math.max(-180, longitude - longitudeSpan);
    const maxLongitude = Math.min(180, longitude + longitudeSpan);
    params.set("start", start);
    params.set("end", end);
    params.set("bbox", [minLongitude, Math.min(90, latitude + latitudeSpan), maxLongitude, Math.max(-90, latitude - latitudeSpan)].map((value) => value.toFixed(3)).join(","));
  } else {
    params.set("days", "30");
  }
  if (category !== "all") params.set("category", category);

  try {
    const response = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?${params}`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 900 },
    });
    if (!response.ok) return apiError("NASA EONET", "Natural-event feed is temporarily unavailable.");
    const payload = (await response.json()) as { events?: EonetEvent[] };
    const events = (payload.events ?? []).map((event) => {
      const geometries = Array.isArray(event.geometry) ? event.geometry : event.geometry ? [event.geometry] : [];
      const latestGeometry = geometries[geometries.length - 1];
      const rawCoordinates = latestGeometry?.coordinates;
      const coordinates = pointFromCoordinates(rawCoordinates);
      const eventCategory = event.categories?.[0];
      return {
        id: String(event.id ?? event.link ?? event.title ?? "event"),
        title: event.title ?? "Natural event",
        description: event.description ?? null,
        category: eventCategory?.title ?? eventCategory?.id ?? "Natural event",
        date: latestGeometry?.date ?? null,
        coordinates,
        url: event.link ?? null,
        sources: (event.sources ?? []).map((source) => source.url ?? source.source ?? source.id ?? "NASA EONET"),
      };
    });
    return Response.json({
      source: "NASA EONET",
      classification: historical ? "HISTORICAL" : "OBSERVED",
      fetchedAt: new Date().toISOString(),
      count: events.length,
      events,
      limitation: "EONET coverage varies by event category and reporting source; this feed is not a complete global disaster inventory.",
    });
  } catch {
    return apiError("NASA EONET", "Natural-event feed is temporarily unavailable.");
  }
}
