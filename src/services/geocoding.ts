import { getJson } from "@/services/api";
import type { SearchLocation } from "@/types/safeguard";

export function searchLocations(query: string, signal?: AbortSignal) {
  return getJson<{ results: SearchLocation[]; source: string }>(
    `/api/geocode?q=${encodeURIComponent(query)}`,
    signal,
  );
}
