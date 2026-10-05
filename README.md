# Safeguard — Disaster Preparedness & Live Monitoring

A responsive disaster-awareness application built on the provided Next.js App Router, React, TypeScript, PostgreSQL and Drizzle runtime. Data is served through isolated server routes so one unavailable provider does not take down another.

## Data sources and configuration

- **Open-Meteo** — current/modelled conditions, forecast, geocoding, air quality and historical weather. Public endpoints; no key is used.
- **USGS** — earthquake GeoJSON feeds. Public endpoint; no key is used.
- **NASA EONET** — natural-event GeoJSON. Public endpoint; category coverage and reporting cadence vary.
- **GDACS** — recent multi-hazard event API; original GDACS alert levels are retained.
- **OpenStreetMap** — base tiles with required attribution in the map.
- **NASA FIRMS** — optional, not enabled as a map overlay unless a secure server-side tile integration is configured. `FIRMS_MAP_KEY` must never be exposed to the browser.
- **ReliefWeb** — optional reports feed. ReliefWeb v2 requires a pre-approved app name; set `RELIEFWEB_APPNAME` server-side. Without it the app reports the feed as unavailable rather than making a rejected request.
- **NDMA/SACHET, IMD, CWC, INCOIS and FSI** — linked in Sources. No government warning feed is represented as live in this deployment.
- **Authentication** — optional provider credentials are not configured by default; guests can use the application and local preparedness checklist.

Copy `.env.example` to `.env` and provide only credentials you actually have. `DATABASE_URL` is required by the existing PostgreSQL health check. SOS requests are stored only after explicit confirmation and successful location capture; this deployment does not send notifications to emergency services or contacts, and never reports a request as delivered.

## Data integrity

Forecasts, observed-event feeds, application advisories and historical records are labeled separately. Safeguard rainfall, wind, heat, visibility and AQI thresholds are application heuristics, not official warnings. Source links and feed limitations are presented in the interface. No live or historical records are generated locally.
