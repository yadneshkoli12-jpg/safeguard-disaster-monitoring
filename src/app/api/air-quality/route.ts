import { apiError, parseCoordinates } from "@/utils/server-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const point = parseCoordinates(request);
  if (!point) return apiError("Open-Meteo Air Quality", "Valid latitude and longitude are required.", 400);

  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    current: "us_aqi,european_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index",
    timezone: "auto",
  }).toString();

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), next: { revalidate: 600 } });
    if (!response.ok) return apiError("Open-Meteo Air Quality", "Air quality data is temporarily unavailable.");
    const data = (await response.json()) as Record<string, unknown>;
    if (!data.current) return apiError("Open-Meteo Air Quality", "The air-quality provider returned incomplete data.");
    return Response.json({
      ...data,
      source: "Open-Meteo Air Quality",
      classification: "FORECAST",
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return apiError("Open-Meteo Air Quality", "Air quality data is temporarily unavailable.");
  }
}
