export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The data source returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return body as T;
}
