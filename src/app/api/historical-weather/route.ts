import { apiError, parseCoordinates } from "@/utils/server-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const point = parseCoordinates(request);
  if (!point) return apiError("Open-Meteo Historical Weather", "Valid latitude and longitude are required.", 400);
  const year = Number(new URL(request.url).searchParams.get("year"));
  const latestCompleteYear = new Date().getFullYear() - 1;
  if (!Number.isInteger(year) || year < 1940 || year > latestCompleteYear) {
    return apiError("Open-Meteo Historical Weather", `Choose a complete year from 1940 to ${latestCompleteYear}.`, 400);
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.search = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    start_date: startDate,
    end_date: endDate,
    daily: "temperature_2m_mean,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
    timezone: "auto",
    wind_speed_unit: "kmh",
  }).toString();

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } });
    if (!response.ok) return apiError("Open-Meteo Historical Weather", "Historical weather data is unavailable for this selection.");
    const data = (await response.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_mean?: (number | null)[];
        precipitation_sum?: (number | null)[];
        wind_speed_10m_max?: (number | null)[];
        relative_humidity_2m_mean?: (number | null)[];
      };
    };
    if (!data.daily?.time?.length) return apiError("Open-Meteo Historical Weather", "No historical weather data is available for this selection.", 404);
    const days = data.daily.time.map((date, index) => ({
      date,
      temperature: data.daily?.temperature_2m_mean?.[index] ?? null,
      rainfall: data.daily?.precipitation_sum?.[index] ?? null,
      wind: data.daily?.wind_speed_10m_max?.[index] ?? null,
      humidity: data.daily?.relative_humidity_2m_mean?.[index] ?? null,
    }));
    return Response.json({ source: "Open-Meteo Historical Weather (reanalysis)", classification: "HISTORICAL", fetchedAt: new Date().toISOString(), year, days });
  } catch {
    return apiError("Open-Meteo Historical Weather", "Historical weather data is temporarily unavailable.");
  }
}
