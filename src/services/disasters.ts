import { getJson } from "@/services/api";
import type { EarthquakeEvent, GdacsEvent, NaturalEvent } from "@/types/safeguard";

export type EventFeed<T> = {
  source: string;
  classification: string;
  fetchedAt: string;
  count: number;
  events: T[];
};

export function fetchEarthquakes(period: "day" | "week" = "day", signal?: AbortSignal) {
  return getJson<EventFeed<EarthquakeEvent>>(`/api/earthquakes?period=${period}`, signal);
}

export function fetchNaturalEvents(signal?: AbortSignal) {
  return getJson<EventFeed<NaturalEvent>>("/api/events", signal);
}

export function fetchHistoricalEvents(
  options: { start: string; end: string; category: string; latitude: number; longitude: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    start: options.start,
    end: options.end,
    category: options.category,
    latitude: String(options.latitude),
    longitude: String(options.longitude),
    status: "all",
  });
  return getJson<EventFeed<NaturalEvent>>(`/api/events?${query}`, signal);
}

export function fetchGdacsEvents(signal?: AbortSignal) {
  return getJson<EventFeed<GdacsEvent>>("/api/gdacs", signal);
}

export type HumanitarianReport = {
  id: string;
  title: string;
  date: string | null;
  url: string | null;
  countries: string[];
};

export function fetchHumanitarianReports(signal?: AbortSignal) {
  return getJson<{ source: string; fetchedAt: string; reports: HumanitarianReport[] }>("/api/reliefweb", signal);
}
