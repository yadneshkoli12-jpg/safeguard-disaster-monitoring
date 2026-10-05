export function parseCoordinates(request: Request) {
  const query = new URL(request.url).searchParams;
  const latitudeValue = query.get("latitude");
  const longitudeValue = query.get("longitude");
  if (latitudeValue === null || longitudeValue === null || latitudeValue.trim() === "" || longitudeValue.trim() === "") return null;
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

export function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function pointFromCoordinates(value: unknown): [number, number] | null {
  const points: [number, number][] = [];
  const visit = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      if (Number.isFinite(node[0]) && Number.isFinite(node[1])) points.push([node[0], node[1]]);
      return;
    }
    for (const child of node) visit(child);
  };
  visit(value);
  if (!points.length) return null;
  const total = points.reduce(([lon, lat], [nextLon, nextLat]) => [lon + nextLon, lat + nextLat], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}

export function pointFromGeometry(value: unknown): [number, number] | null {
  if (typeof value !== "object" || value === null || !("coordinates" in value)) return pointFromCoordinates(value);
  return pointFromCoordinates(value.coordinates);
}

export function apiError(source: string, message: string, status = 502) {
  return Response.json({ source, error: message }, { status });
}
