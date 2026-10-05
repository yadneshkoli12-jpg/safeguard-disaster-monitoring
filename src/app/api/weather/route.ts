import { apiError, parseCoordinates } from "@/utils/server-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const point = parseCoordinates(request);
  if (!point) return apiError("Open-Meteo", "Valid latitude and longitude are required.", 400);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index",
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,snowfall,weather_code,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,visibility,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  }).toString();

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), next: { revalidate: 300 } });
    if (!response.ok) return apiError("Open-Meteo", "Weather data is temporarily unavailable.");
    const data = (await response.json()) as Record<string, unknown>;
    if (!data.current || !data.hourly || !data.daily) return apiError("Open-Meteo", "The weather provider returned incomplete data.");
    const requiredCurrent = data.current as Record<string, unknown>;
    if (!Number.isFinite(requiredCurrent.temperature_2m) || !Number.isFinite(requiredCurrent.apparent_temperature) || !Number.isFinite(requiredCurrent.weather_code)) {
      return apiError("Open-Meteo", "The weather provider did not return required current-condition values.");
    }
    const hourlyData = data.hourly as Record<string, unknown>;
    const dailyData = data.daily as Record<string, unknown>;
    if (!Array.isArray(hourlyData.time) || !Array.isArray(hourlyData.temperature_2m) || !Array.isArray(dailyData.time) || !Array.isArray(dailyData.weather_code)) {
      return apiError("Open-Meteo", "The weather provider returned incomplete forecast periods.");
    }
    const currentUnits = (data.current_units ?? {}) as Record<string, string>;
    return Response.json({
      ...data,
      source: "Open-Meteo",
      classification: "FORECAST",
      fetchedAt: new Date().toISOString(),
      units: {
        temperature: currentUnits.temperature_2m ?? "°C",
        wind: currentUnits.wind_speed_10m ?? "km/h",
        precipitation: currentUnits.precipitation ?? "mm",
        visibility: currentUnits.visibility ?? "m",
      },
    });
  } catch {
    return apiError("Open-Meteo", "Weather data is temporarily unavailable.");
  }
}
