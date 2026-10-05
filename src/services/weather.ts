import { getJson } from "@/services/api";
import type { AirQualityData, HistoricalWeatherDay, WeatherData } from "@/types/safeguard";

export function fetchWeather(latitude: number, longitude: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  return getJson<WeatherData>(`/api/weather?${query}`, signal);
}

export function fetchAirQuality(latitude: number, longitude: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  return getJson<AirQualityData>(`/api/air-quality?${query}`, signal);
}

export function fetchHistoricalWeather(latitude: number, longitude: number, year: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), year: String(year) });
  return getJson<{ source: string; classification: "HISTORICAL"; fetchedAt: string; days: HistoricalWeatherDay[] }>(
    `/api/historical-weather?${query}`,
    signal,
  );
}
