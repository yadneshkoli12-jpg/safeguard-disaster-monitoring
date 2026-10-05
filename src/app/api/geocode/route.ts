import { apiError } from "@/utils/server-data";

export const dynamic = "force-dynamic";

type GeocodingResult = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ source: "Open-Meteo Geocoding", results: [] }, { status: 200 });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "7", language: "en", format: "json" }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), next: { revalidate: 3600 } });
    if (!response.ok) return apiError("Open-Meteo Geocoding", "Location search is temporarily unavailable.");
    const payload = (await response.json()) as { results?: GeocodingResult[] };
    const results = (payload.results ?? [])
      .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      .map((place) => ({
        id: place.id,
        name: place.name,
        admin1: place.admin1,
        country: place.country,
        countryCode: place.country_code,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      }));
    return Response.json({ source: "Open-Meteo Geocoding", results });
  } catch {
    return apiError("Open-Meteo Geocoding", "Location search is temporarily unavailable.");
  }
}
