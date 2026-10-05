import { apiError } from "@/utils/server-data";

export const dynamic = "force-dynamic";

type UsgsFeature = {
  id: string;
  geometry?: { coordinates?: number[] } | null;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number;
    updated?: number;
    alert?: string | null;
    tsunami?: number;
    sig?: number;
    url?: string;
    title?: string;
  };
};

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period") === "week" ? "week" : "day";
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${period}.geojson`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), next: { revalidate: 300 } });
    if (!response.ok) return apiError("USGS", "Earthquake feed is temporarily unavailable.");
    const payload = (await response.json()) as { features?: UsgsFeature[] };
    const events = (payload.features ?? [])
      .filter((feature) => Array.isArray(feature.geometry?.coordinates) && feature.geometry.coordinates.length >= 3)
      .map((feature) => {
        const properties = feature.properties ?? {};
        const coordinates = feature.geometry!.coordinates!;
        return {
          id: feature.id,
          magnitude: typeof properties.mag === "number" ? properties.mag : null,
          place: properties.place ?? "Location not provided",
          time: properties.time ?? 0,
          updated: properties.updated ?? properties.time ?? 0,
          coordinates: [coordinates[0], coordinates[1], coordinates[2]] as [number, number, number],
          alert: properties.alert ?? null,
          tsunami: properties.tsunami === 1,
          significance: typeof properties.sig === "number" ? properties.sig : null,
          url: properties.url ?? "https://earthquake.usgs.gov/earthquakes/feed/",
          title: properties.title ?? "Earthquake event",
        };
      })
      .sort((a, b) => b.time - a.time);
    return Response.json({
      source: "USGS",
      classification: "OBSERVED",
      period,
      fetchedAt: new Date().toISOString(),
      count: events.length,
      events,
    });
  } catch {
    return apiError("USGS", "Earthquake feed is temporarily unavailable.");
  }
}
