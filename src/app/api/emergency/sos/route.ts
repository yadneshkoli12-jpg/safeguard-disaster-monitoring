import { db } from "@/db";
import { sosIncidents } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("latitude" in body) || !("longitude" in body)) {
    return Response.json({ error: "A location is required to log an emergency request." }, { status: 400 });
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = "accuracy" in body ? Number(body.accuracy) : null;
  const note = "note" in body && typeof body.note === "string" ? body.note.slice(0, 300) : null;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "The supplied coordinates are invalid." }, { status: 400 });
  }

  try {
    const [incident] = await db
      .insert(sosIncidents)
      .values({
        latitude,
        longitude,
        accuracyMeters: Number.isFinite(accuracy) && accuracy !== null ? accuracy : null,
        note,
      })
      .returning({ id: sosIncidents.id, createdAt: sosIncidents.createdAt, status: sosIncidents.status });

    return Response.json(
      {
        incident,
        status: "initiated",
        deliveryStatus: "not_configured",
        message: "The request was recorded by Safeguard. No emergency service or contact was notified.",
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "The request could not be recorded. Call your local emergency number directly." }, { status: 503 });
  }
}
