"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cloud,
  CloudRain,
  CloudSun,
  Compass,
  Database,
  Droplets,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
  HeartPulse,
  Home,
  Info,
  ListChecks,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Menu,
  Mountain,
  Navigation,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AirQualityCard from "@/components/weather/AirQualityCard";
import WeatherHero from "@/components/weather/WeatherHero";
import ResourceMessage from "@/components/ui/ResourceMessage";
import { weatherDescription, WeatherSymbol } from "@/components/weather/weather-code";
import { fetchGdacsEvents, fetchHumanitarianReports, fetchHistoricalEvents, fetchNaturalEvents, fetchEarthquakes } from "@/services/disasters";
import { searchLocations } from "@/services/geocoding";
import { fetchAirQuality, fetchHistoricalWeather, fetchWeather } from "@/services/weather";
import type {
  AirQualityData,
  ApplicationAdvisory,
  EarthquakeEvent,
  GdacsEvent,
  HistoricalWeatherDay,
  NaturalEvent,
  ResourceState,
  SearchLocation,
  UserLocation,
  WeatherData,
} from "@/types/safeguard";
import type { EventFeed, HumanitarianReport } from "@/services/disasters";
import type { MapLayerState } from "@/components/map/MonitoringMap";

const MonitoringMap = dynamic(() => import("@/components/map/MonitoringMap"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="map-loading-mark"><MapIcon size={21} /></span><span>Preparing the base map…</span></div>,
});

const DEFAULT_LOCATION: UserLocation = {
  name: "Navi Mumbai",
  admin1: "Maharashtra",
  country: "India",
  latitude: 19.033,
  longitude: 73.0297,
  timezone: "Asia/Kolkata",
};

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "map", label: "Live map", icon: MapIcon },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "prepare", label: "Prepare", icon: ListChecks },
  { id: "first-aid", label: "First aid", icon: HeartPulse },
  { id: "emergency", label: "Emergency", icon: PhoneCall },
  { id: "sources", label: "Sources", icon: Database },
] as const;

type AppView = (typeof navItems)[number]["id"];
type Loader<T> = (signal: AbortSignal) => Promise<T>;
type ChartMetric = "temperature" | "rainfall" | "wind" | "humidity";

type HistoricalQuery = { start: string; end: string; category: string };
type SosResult = { status: "initiated" | "failed"; message: string; incidentId?: string; createdAt?: string };

const emergencyKitItems = [
  "Drinking water",
  "Non-perishable food",
  "First-aid supplies",
  "Flashlight",
  "Power bank",
  "Battery or hand-crank radio",
  "Important documents",
  "Cash and payment essentials",
  "Basic medicines",
  "Phone charger and cables",
];

const hazardGuides = [
  {
    title: "Earthquake",
    icon: Activity,
    before: ["Secure tall furniture and identify safe cover in each room.", "Keep sturdy shoes, a flashlight, and essential medicines accessible."],
    during: ["Drop, cover, and hold on; protect your head and neck.", "Stay indoors away from windows; if outside, move away from buildings and power lines."],
    after: ["Expect aftershocks. Check for injuries and obvious hazards without entering damaged structures.", "Follow local authorities and use text messages when networks are congested."],
  },
  {
    title: "Flood",
    icon: Droplets,
    before: ["Know local flood-prone areas and a route to higher ground.", "Move documents, medicines, and chargers into a waterproof bag."],
    during: ["Move to higher ground when local authorities advise; avoid walking or driving through floodwater.", "Stay away from drains, bridges, and downed power lines."],
    after: ["Return only when authorities say it is safe; floodwater may hide contamination or electrical hazards.", "Use safe drinking water and document damage when conditions allow."],
  },
  {
    title: "Cyclone",
    icon: Wind,
    before: ["Secure loose outdoor items and prepare water, food, medicines, and a charged phone.", "Know the designated shelter and evacuation guidance for your area."],
    during: ["Follow official IMD and local-authority instructions; evacuate when directed.", "Stay indoors away from windows. Do not go outside during a lull unless authorities confirm it is safe."],
    after: ["Keep clear of fallen power lines, damaged buildings, and standing water.", "Wait for official all-clear information before returning to affected areas."],
  },
  {
    title: "Wildfire",
    icon: Flame,
    before: ["Know more than one exit route and keep essential items ready to leave.", "Clear dry leaves around your home where safe and permitted."],
    during: ["Leave early when officials advise; do not wait for a fire to approach.", "If smoke is present, reduce outdoor exposure and follow local health advice."],
    after: ["Do not return until authorities say the area is safe.", "Avoid hot ash, unstable trees, and damaged utility lines."],
  },
  {
    title: "Lightning",
    icon: Zap,
    before: ["Check local forecasts before outdoor activities and identify a substantial enclosed shelter.", "Move indoors when thunder is heard; no outdoor area is safe during a storm."],
    during: ["Get inside a substantial building or hard-topped vehicle; avoid open fields and isolated trees.", "Wait at least 30 minutes after the last thunder before resuming outdoor activity."],
    after: ["Call local emergency services for anyone struck; cardiac arrest requires immediate help.", "Avoid damaged electrical equipment and report hazards to local authorities."],
  },
  {
    title: "Landslide",
    icon: Mountain,
    before: ["Learn local warning signs such as new ground cracks, leaning trees, or unusual water flow.", "Know evacuation routes away from steep slopes and drainage channels."],
    during: ["Move away from the path of a slide immediately and head to higher, stable ground.", "If escape is impossible, curl into a ball and protect your head."],
    after: ["Stay away from the slide area; additional movement may follow.", "Report damaged utilities and follow official instructions before returning."],
  },
  {
    title: "Extreme heat",
    icon: Sun,
    before: ["Plan strenuous activities for cooler hours and identify a cool place to go.", "Check on people who may be more vulnerable to heat illness."],
    during: ["Drink water regularly, rest in shade or a cool room, and follow local health advice.", "Seek urgent medical help for confusion, fainting, or suspected heat stroke."],
    after: ["Continue cooling and rehydration; get medical advice if symptoms persist.", "Never leave a child or person in a parked vehicle."],
  },
  {
    title: "Heavy rainfall",
    icon: CloudRain,
    before: ["Clear drains where safe and keep essentials and documents off the floor.", "Monitor official local advisories and identify higher ground."],
    during: ["Avoid flooded roads, underpasses, and fast-moving water.", "Move to a safer level if water enters your home; do not touch wet electrical equipment."],
    after: ["Avoid floodwater and report hazards; use safe water until local guidance says otherwise.", "Check damaged structures carefully and let professionals handle electrical hazards."],
  },
];

const sourceDirectory = [
  { name: "Open-Meteo", provides: "Model-based current conditions, forecast, geocoding, air quality, and historical weather reanalysis.", url: "https://open-meteo.com/", key: "weather" },
  { name: "USGS Earthquake Hazards Program", provides: "Earthquake GeoJSON event feeds with magnitude, depth, timestamp, tsunami flag, and event details where provided.", url: "https://earthquake.usgs.gov/earthquakes/feed/", key: "earthquakes" },
  { name: "NASA EONET", provides: "Curated natural-event records by supported category. Coverage and reporting cadence vary; this is not a complete disaster inventory.", url: "https://eonet.gsfc.nasa.gov/", key: "events" },
  { name: "GDACS", provides: "Global disaster event records and source-defined alert levels. GDACS coverage and alert meaning are retained.", url: "https://www.gdacs.org/", key: "gdacs" },
  { name: "NASA FIRMS", provides: "Satellite fire/hotspot products. Optional layer is disabled until a secure, configured map-tile integration is available.", url: "https://firms.modaps.eosdis.nasa.gov/", key: "firms" },
  { name: "ReliefWeb", provides: "Humanitarian reports, not sensor observations. The API requires a pre-approved app name since November 2025.", url: "https://reliefweb.int/", key: "reliefweb" },
  { name: "NDMA / SACHET", provides: "Official Indian disaster information and alerts. No live government warning feed is connected in this deployment.", url: "https://sachet.ndma.gov.in/", key: "official" },
  { name: "India Meteorological Department", provides: "Official meteorological forecasts and warning information. No live IMD warning feed is connected in this deployment.", url: "https://mausam.imd.gov.in/", key: "official" },
  { name: "Central Water Commission", provides: "Official flood forecasting resources. No live CWC warning feed is connected in this deployment.", url: "https://ffs.india-water.gov.in/", key: "official" },
  { name: "INCOIS", provides: "Official ocean information and coastal advisories. No live INCOIS warning feed is connected in this deployment.", url: "https://incois.gov.in/", key: "official" },
  { name: "Forest Survey of India", provides: "Official forest and fire information. No live FSI warning feed is connected in this deployment.", url: "https://fsi.nic.in/", key: "official" },
  { name: "OpenStreetMap", provides: "OpenStreetMap-compatible base tiles and map data, with attribution shown on the map.", url: "https://www.openstreetmap.org/copyright", key: "map" },
] as const;

function useApiResource<T>(loader: Loader<T>, key: string, enabled = true, refreshMs = 0) {
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);
  const keyRef = useRef(key);

  useEffect(() => {
    if (!enabled) return;
    const changedKey = keyRef.current !== key;
    keyRef.current = key;
    setState((previous) => !changedKey && previous.data ? { ...previous, status: "stale", error: undefined } : { status: "loading" });
    const controller = new AbortController();
    loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const upstreamTime = typeof data === "object" && data !== null && "fetchedAt" in data && typeof data.fetchedAt === "string"
          ? data.fetchedAt
          : new Date().toISOString();
        setState({ status: "success", data, updatedAt: upstreamTime });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        const message = error instanceof Error ? error.message : "This data source is temporarily unavailable.";
        setState((previous) => previous.data && !changedKey
          ? { status: "stale", data: previous.data, updatedAt: previous.updatedAt, error: message }
          : { status: "error", error: message });
      });
    return () => controller.abort();
  }, [loader, key, enabled, refreshToken]);

  useEffect(() => {
    if (!enabled || refreshMs <= 0) return;
    const timer = window.setInterval(() => setRefreshToken((value) => value + 1), refreshMs);
    return () => window.clearInterval(timer);
  }, [enabled, refreshMs]);

  const retry = useCallback(() => setRefreshToken((value) => value + 1), []);
  return { state, retry };
}

function formatDateTime(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "Time not provided";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.valueOf()) ? "Time not provided" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatCheckedAt(value?: string) {
  if (!value) return "Not checked this session";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Not checked this session" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getAqiSummary(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return { label: "AQI unavailable", className: "aqi-neutral", text: "No index value was returned by the air-quality source." };
  if (value <= 50) return { label: "Good", className: "aqi-good", text: "Air quality is good on the US AQI scale." };
  if (value <= 100) return { label: "Moderate", className: "aqi-moderate", text: "Sensitive people may notice effects; follow local health guidance." };
  if (value <= 150) return { label: "Sensitive groups", className: "aqi-sensitive", text: "People sensitive to air pollution may limit prolonged outdoor exertion." };
  if (value <= 200) return { label: "Unhealthy", className: "aqi-unhealthy", text: "Consider reducing prolonged outdoor exertion and follow local health advice." };
  if (value <= 300) return { label: "Very unhealthy", className: "aqi-very-unhealthy", text: "Reduce outdoor exposure and follow local health advice." };
  return { label: "Hazardous", className: "aqi-hazardous", text: "Avoid outdoor exposure where possible and follow local health guidance." };
}

function buildAdvisories(weather?: WeatherData, air?: AirQualityData): ApplicationAdvisory[] {
  if (!weather) return [];
  const current = weather.current;
  const hourly = weather.hourly;
  const currentHour = hourly.time.findIndex((time) => time.slice(0, 13) >= current.time.slice(0, 13));
  const start = currentHour >= 0 ? currentHour : 0;
  const nextIndexes = Array.from({ length: Math.min(6, hourly.time.length - start) }, (_, index) => start + index);
  const maxRain = Math.max(0, ...nextIndexes.map((index) => hourly.precipitation[index] ?? 0));
  const maxGust = Math.max(current.wind_gusts_10m, ...nextIndexes.map((index) => hourly.wind_gusts_10m[index] ?? 0));
  const thunderstorm = current.weather_code >= 95 || nextIndexes.some((index) => (hourly.weather_code[index] ?? 0) >= 95);
  const items: ApplicationAdvisory[] = [];
  const add = (id: string, title: string, description: string, severity: "moderate" | "high") => items.push({ id, title, description, severity, source: "Open-Meteo + Safeguard threshold", classification: "APPLICATION ADVISORY" });

  if (thunderstorm) add("thunderstorm", "Thunderstorm conditions", "Thunderstorm conditions are included in current or near-term model data. Check local official guidance.", "high");
  if (maxRain >= 20) add("heavy-rain", "Heavy rainfall advisory", `A modelled hourly rainfall amount reaches ${maxRain.toFixed(1)} mm in the next six hours. Avoid floodwater and check official local guidance.`, "high");
  if (maxGust >= 60) add("strong-wind", "Strong wind advisory", `Modelled wind gusts reach ${Math.round(maxGust)} km/h. Secure loose items where safe and follow local guidance.`, "moderate");
  if (current.temperature_2m >= 40) add("extreme-heat", "Extreme heat advisory", `The current modelled temperature is ${Math.round(current.temperature_2m)}°C (Safeguard threshold: 40°C). Reduce heat exposure and follow local health advice.`, "high");
  if (typeof current.visibility === "number" && Number.isFinite(current.visibility) && current.visibility < 1000) add("low-visibility", "Reduced visibility advisory", `Modelled visibility is below 1 km (${Math.round(current.visibility)} m). Use caution and follow local travel guidance.`, "moderate");
  const aqi = air?.current.us_aqi;
  if (aqi !== null && aqi !== undefined && aqi >= 151) add("air-quality", "Poor air quality advisory", `The modelled US AQI is ${Math.round(aqi)} (Safeguard threshold: 151). Consider reducing prolonged outdoor exertion.`, aqi >= 201 ? "high" : "moderate");
  return items;
}

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const first = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(first), Math.sqrt(1 - first));
}

function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function SectionIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="section-intro">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {children && <div className="section-intro-action">{children}</div>}
    </div>
  );
}

function CardHeading({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: React.ReactNode }) {
  return <div className="card-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{aside}</div>;
}

function StatusLabel({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`status-label status-label-${tone}`}><span className="status-label-dot" />{children}</span>;
}

function AQIContent({ state, onRetry, detailed = false }: { state: ResourceState<AirQualityData>; onRetry: () => void; detailed?: boolean }) {
  const current = state.data?.current;
  const summary = getAqiSummary(current?.us_aqi);
  return (
    <div className={`aqi-card-inner ${detailed ? "aqi-card-detailed" : ""}`}>
      {!current ? <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} compact /> : <>
        <div className="aqi-score-row">
          <div className={`aqi-score ${summary.className}`}>{current.us_aqi ?? "—"}<span>US AQI</span></div>
          <div className="aqi-summary-copy"><StatusLabel tone={current.us_aqi === null ? "neutral" : current.us_aqi > 150 ? "danger" : current.us_aqi > 100 ? "warning" : "success"}>{summary.label}</StatusLabel><p>{summary.text}</p><small>FORECAST · {state.data?.source}</small></div>
        </div>
        <div className="aqi-meter" role="img" aria-label={current.us_aqi === null ? "Air quality index unavailable" : `US air quality index ${current.us_aqi}`}><span style={{ width: `${Math.min(100, Math.max(2, (current.us_aqi ?? 0) / 3))}%` }} /></div>
        <div className="aqi-secondary"><div><span>PM2.5</span><strong>{current.pm2_5 === null ? "—" : `${current.pm2_5.toFixed(1)} μg/m³`}</strong></div><div><span>PM10</span><strong>{current.pm10 === null ? "—" : `${current.pm10.toFixed(1)} μg/m³`}</strong></div><div><span>European AQI</span><strong>{current.european_aqi ?? "—"}</strong></div></div>
        {detailed && <div className="pollutant-grid"><div><span>NO₂</span><strong>{current.nitrogen_dioxide === null ? "—" : `${current.nitrogen_dioxide.toFixed(1)} μg/m³`}</strong></div><div><span>SO₂</span><strong>{current.sulphur_dioxide === null ? "—" : `${current.sulphur_dioxide.toFixed(1)} μg/m³`}</strong></div><div><span>O₃</span><strong>{current.ozone === null ? "—" : `${current.ozone.toFixed(1)} μg/m³`}</strong></div><div><span>UV index</span><strong>{current.uv_index ?? "—"}</strong></div></div>}
        <p className="data-footnote">Open-Meteo air-quality model. Not a substitute for official public-health advice.</p>
      </>}
    </div>
  );
}

function WeatherOutlook({ weather, state, onRetry }: { weather?: WeatherData; state: ResourceState<WeatherData>; onRetry: () => void }) {
  if (!weather) return <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} compact />;
  return (
    <div className="outlook-list">
      {state.status === "stale" && <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} compact />}
      {weather.daily.time.slice(0, 6).map((day, index) => (
        <div className="outlook-row" key={day}>
          <span className="outlook-day">{index === 0 ? "Today" : dateLabel(day)}</span>
          <WeatherSymbol code={weather.daily.weather_code[index] ?? 0} size={20} />
          <span className="outlook-condition">{weatherDescription(weather.daily.weather_code[index] ?? 0)}</span>
          <span className="outlook-rain"><Droplets size={12} />{weather.daily.precipitation_probability_max[index] ?? 0}%</span>
          <span className="outlook-temp"><strong>{Math.round(weather.daily.temperature_2m_max[index] ?? 0)}°</strong><span>{Math.round(weather.daily.temperature_2m_min[index] ?? 0)}°</span></span>
        </div>
      ))}
      <div className="data-source-caption">FORECAST · Open-Meteo · Last checked {formatCheckedAt(weather.fetchedAt)}</div>
    </div>
  );
}

function LayerToggle({ title, detail, active, onClick, disabled = false, badge }: { title: string; detail: string; active: boolean; onClick: () => void; disabled?: boolean; badge?: string }) {
  return (
    <button type="button" className={`layer-toggle ${active ? "layer-toggle-active" : ""} ${disabled ? "layer-toggle-disabled" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={active}>
      <span className={`layer-switch ${active ? "layer-switch-on" : ""}`} aria-hidden="true"><span /></span>
      <span className="layer-toggle-copy"><strong>{title}{badge && <em>{badge}</em>}</strong><small>{detail}</small></span>
    </button>
  );
}

function SourceUpdate({ state }: { state?: ResourceState<unknown> }) {
  if (!state) return <span className="source-update">Not checked this session</span>;
  if (state.status === "error") return <span className="source-update source-update-error">No successful update · feed unavailable</span>;
  if (state.status === "loading") return <span className="source-update">Checking source…</span>;
  if (state.status === "stale") return <span className="source-update">Last successful retrieval {formatCheckedAt(state.updatedAt)} · current response not confirmed</span>;
  return <span className="source-update">Last successful retrieval {formatCheckedAt(state.updatedAt)}</span>;
}

function AppDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
        {children}
      </section>
    </div>
  );
}

export default function SafeguardApp() {
  const { profile, logout } = useAuth();
  const [view, setView] = useState<AppView>("home");
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [kitReady, setKitReady] = useState<Record<string, boolean>>(() => Object.fromEntries(emergencyKitItems.map((item) => [item, false])));
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<SearchLocation[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountDialog, setAccountDialog] = useState(false);
  const [sosDialog, setSosDialog] = useState(false);
  const [sosConsent, setSosConsent] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosResult, setSosResult] = useState<SosResult | null>(null);
  const [layers, setLayers] = useState<MapLayerState>({ earthquakes: true, naturalEvents: true, gdacs: false });
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [hazardCategory, setHazardCategory] = useState("all");
  const [appliedHistory, setAppliedHistory] = useState<HistoricalQuery>({ start: "2015-01-01", end: new Date().toISOString().slice(0, 10), category: "all" });
  const [historyFilterError, setHistoryFilterError] = useState("");
  const [weatherYear, setWeatherYear] = useState(new Date().getFullYear() - 1);
  const [weatherMetric, setWeatherMetric] = useState<ChartMetric>("temperature");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const savedLocation = window.localStorage.getItem("safeguard.location.v1");
      if (savedLocation) {
        const parsed = JSON.parse(savedLocation) as UserLocation;
        if (parsed && typeof parsed.name === "string" && Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) setLocation(parsed);
      }
      const savedKit = window.localStorage.getItem("safeguard.kit.v1");
      if (savedKit) {
        const parsed = JSON.parse(savedKit) as Record<string, boolean>;
        setKitReady((current) => Object.fromEntries(emergencyKitItems.map((item) => [item, Boolean(parsed[item] ?? current[item])])));
      }
    } catch {
      // Invalid or unavailable local preferences safely fall back to guest defaults.
    }
    setPreferencesLoaded(true);
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem("safeguard.location.v1", JSON.stringify(location));
      window.localStorage.setItem("safeguard.kit.v1", JSON.stringify(kitReady));
    } catch {
      setNotice("Local storage is unavailable. This session will not retain your location or kit checklist.");
    }
  }, [location, kitReady, preferencesLoaded]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (locationQuery.trim().length < 2) {
      setLocationResults([]);
      setSearchState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      searchLocations(locationQuery.trim(), controller.signal)
        .then((result) => { setLocationResults(result.results); setSearchState("success"); })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setLocationResults([]);
          setSearchState("error");
          if (error instanceof Error && error.name !== "AbortError") setNotice("Location search is unavailable right now.");
        });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locationQuery]);

  const weatherLoader = useCallback((signal: AbortSignal) => fetchWeather(location.latitude, location.longitude, signal), [location.latitude, location.longitude]);
  const airLoader = useCallback((signal: AbortSignal) => fetchAirQuality(location.latitude, location.longitude, signal), [location.latitude, location.longitude]);
  const quakeLoader = useCallback((signal: AbortSignal) => fetchEarthquakes("day", signal), []);
  const eventLoader = useCallback((signal: AbortSignal) => fetchNaturalEvents(signal), []);
  const gdacsLoader = useCallback((signal: AbortSignal) => fetchGdacsEvents(signal), []);
  const reportsLoader = useCallback((signal: AbortSignal) => fetchHumanitarianReports(signal), []);
  const weatherHistoryLoader = useCallback((signal: AbortSignal) => fetchHistoricalWeather(location.latitude, location.longitude, weatherYear, signal), [location.latitude, location.longitude, weatherYear]);
  const disasterHistoryLoader = useCallback((signal: AbortSignal) => fetchHistoricalEvents({
    ...appliedHistory,
    latitude: location.latitude,
    longitude: location.longitude,
  }, signal), [appliedHistory, location.latitude, location.longitude]);

  const weatherResource = useApiResource(weatherLoader, `${location.latitude},${location.longitude}`, true, 10 * 60 * 1000);
  const airResource = useApiResource(airLoader, `${location.latitude},${location.longitude}`, true, 15 * 60 * 1000);
  const quakeResource = useApiResource(quakeLoader, "usgs-all-day", true, 5 * 60 * 1000);
  const eventResource = useApiResource(eventLoader, "eonet-active", true, 15 * 60 * 1000);
  const gdacsResource = useApiResource(gdacsLoader, "gdacs-recent", true, 10 * 60 * 1000);
  const reportResource = useApiResource(reportsLoader, "reliefweb-latest", view === "alerts" || view === "sources", 30 * 60 * 1000);
  const weatherHistoryResource = useApiResource(weatherHistoryLoader, `${location.latitude},${location.longitude},${weatherYear}`, view === "analytics");
  const historyKey = `${location.latitude},${location.longitude},${appliedHistory.start},${appliedHistory.end},${appliedHistory.category}`;
  const disasterHistoryResource = useApiResource(disasterHistoryLoader, historyKey, view === "analytics");

  const weather = weatherResource.state.data;
  const air = airResource.state.data;
  const earthquakes = quakeResource.state.data?.events ?? [];
  const naturalEvents = eventResource.state.data?.events ?? [];
  const gdacsEvents = gdacsResource.state.data?.events ?? [];
  const reports: HumanitarianReport[] = reportResource.state.data?.reports ?? [];
  const advisories = useMemo(() => buildAdvisories(weather, air), [weather, air]);
  const kitCount = Object.values(kitReady).filter(Boolean).length;
  const localQuakes = earthquakes.filter((event) => distanceKm([location.latitude, location.longitude], [event.coordinates[1], event.coordinates[0]]) <= 1000);
  const largestLocalQuake = localQuakes.reduce<EarthquakeEvent | null>((largest, event) => !largest || (event.magnitude ?? 0) > (largest.magnitude ?? 0) ? event : largest, null);
  const nearestQuake = earthquakes.reduce<{ event: EarthquakeEvent; distance: number } | null>((nearest, event) => {
    const distance = distanceKm([location.latitude, location.longitude], [event.coordinates[1], event.coordinates[0]]);
    return !nearest || distance < nearest.distance ? { event, distance } : nearest;
  }, null);

  const chooseLocation = (result: SearchLocation) => {
    setLocation({ name: result.name, admin1: result.admin1, country: result.country, latitude: result.latitude, longitude: result.longitude, timezone: result.timezone });
    setLocationQuery("");
    setLocationResults([]);
    setSearchState("idle");
    setShowSearchResults(false);
    setNotice(`Location set to ${result.name}${result.country ? `, ${result.country}` : ""}.`);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setNotice("This browser does not support location detection. Search for a place instead.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const detected: UserLocation = {
        name: "Detected location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(detected);
      setLocationQuery("");
      setShowSearchResults(false);
      setLocationBusy(false);
      setNotice(`Location detected (${detected.latitude.toFixed(3)}°, ${detected.longitude.toFixed(3)}°).`);
    }, (error) => {
      setLocationBusy(false);
      if (error.code === error.PERMISSION_DENIED) setNotice("Location permission was denied. Search for a city to continue.");
      else if (error.code === error.TIMEOUT) setNotice("Location detection timed out. Search for a city or try again.");
      else setNotice("Your location is unavailable. Search for a city or try again.");
    }, { enableHighAccuracy: true, timeout: 18000, maximumAge: 0 });
  };

  const refreshAll = () => {
    weatherResource.retry();
    airResource.retry();
    quakeResource.retry();
    eventResource.retry();
    gdacsResource.retry();
    setNotice("Checking configured data sources independently.");
  };

  const setActiveView = (next: AppView) => {
    setView(next);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentPage = navItems.find((item) => item.id === view)?.label ?? "Home";
  const locationDisplay = location.name === "Detected location"
    ? `Detected · ${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`
    : [location.name, location.admin1, location.country].filter(Boolean).join(", ");



  const renderHome = () => (
    <>
      <div className="home-welcome-row"><div><span className="eyebrow">LOCAL CONDITIONS & DISASTER STATUS</span><h1>Stay aware. Stay ready.</h1><p>Current conditions and source-backed disaster awareness for {location.name}.</p></div><button className="button button-secondary refresh-button" type="button" onClick={refreshAll}><RefreshCw size={15} />Refresh data</button></div>
      <div className="home-feature-grid">
        <WeatherHero location={location} state={weatherResource.state} advisories={advisories} onRetry={weatherResource.retry} />
        <AirQualityCard state={airResource.state} onRetry={airResource.retry} onDetails={() => setActiveView("weather")} />
      </div>
      <div className="dashboard-grid dashboard-grid-two">
        <section className="card alerts-card"><CardHeading eyebrow="SOURCE CHECKS · NOT AN ALL-CLEAR" title="What needs attention" aside={<button type="button" className="inline-link" onClick={() => setActiveView("alerts")}>Open alerts <ArrowRight size={14} /></button>} />
          {weatherResource.state.status === "stale" && <ResourceMessage status="stale" error={weatherResource.state.error} onRetry={weatherResource.retry} compact />}
          {airResource.state.status === "stale" && <ResourceMessage status="stale" error={airResource.state.error} onRetry={airResource.retry} compact />}
          {advisories.length === 0 && gdacsEvents.length === 0 ? <div className="quiet-state"><span className="quiet-icon"><ShieldCheck size={19} /></span><div><strong>No application advisories from available readings</strong><p>This is not an all-clear. Independent feeds may be delayed or unavailable.</p></div></div> : <div className="alert-list">{advisories.slice(0, 2).map((item) => <div className="compact-alert" key={item.id}><span className={`alert-severity alert-severity-${item.severity}`}><AlertTriangle size={15} /></span><div><strong>{item.title}</strong><p>{item.description}</p><small>APPLICATION ADVISORY · {item.source}</small></div></div>)}{gdacsEvents.slice(0, Math.max(0, 2 - advisories.length)).map((item) => <div className="compact-alert" key={item.id}><span className="alert-severity alert-severity-neutral"><Activity size={15} /></span><div><strong>{item.title}</strong><p>{item.eventType}{item.alertLevel ? ` · GDACS ${item.alertLevel} alert level` : " · GDACS event"}</p><small>OBSERVED EVENT · GDACS</small></div></div>)}</div>}
        </section>
        <section className="card outlook-card"><CardHeading eyebrow="NEXT 6 DAYS" title="Weather outlook" aside={<span className="forecast-label">FORECAST</span>} /><WeatherOutlook weather={weather} state={weatherResource.state} onRetry={weatherResource.retry} /></section>
      </div>
      <div className="quick-action-grid" aria-label="Quick actions">
        {[
          { id: "map" as const, label: "Live map", sub: "Explore event layers", icon: MapIcon, tone: "quick-blue" },
          { id: "alerts" as const, label: "Alerts", sub: "Review source checks", icon: Bell, tone: "quick-amber" },
          { id: "analytics" as const, label: "Historical analysis", sub: "Explore recorded events", icon: BarChart3, tone: "quick-teal" },
          { id: "prepare" as const, label: "Prepare", sub: "Read practical guides", icon: PackageCheck, tone: "quick-violet" },
          { id: "emergency" as const, label: "Emergency", sub: "Local numbers & support", icon: PhoneCall, tone: "quick-red" },
        ].map((action) => <button className="quick-action card" type="button" key={action.id} onClick={() => setActiveView(action.id)}><span className={`quick-action-icon ${action.tone}`}><action.icon size={18} /></span><span><strong>{action.label}</strong><small>{action.sub}</small></span><ChevronRight size={16} className="quick-action-arrow" /></button>)}
      </div>
      <div className="dashboard-grid dashboard-grid-map">
        <section className="card map-preview-card"><CardHeading eyebrow="LIVE MONITORING" title="Events on the map" aside={<button className="inline-link" type="button" onClick={() => setActiveView("map")}>Full map <ArrowRight size={14} /></button>} /><div className="map-preview"><MonitoringMap location={location} earthquakes={earthquakes} naturalEvents={naturalEvents} gdacsEvents={gdacsEvents} layers={layers} weatherData={weatherResource.state.data} /></div><div className="map-source-legend"><span><i className="legend-dot legend-quake" />USGS earthquakes</span><span><i className="legend-dot legend-eonet" />NASA EONET</span><span><i className="legend-dot legend-gdacs" />GDACS</span><small>Base map always available independently of event feeds.</small></div></section>
        <section className="card activity-card"><CardHeading eyebrow="USGS · OBSERVED EVENTS" title="Earthquake activity" aside={<button type="button" className="inline-link" onClick={() => setActiveView("map")}>Map <ArrowRight size={14} /></button>} />
          {quakeResource.state.status === "stale" && <ResourceMessage status="stale" error={quakeResource.state.error} onRetry={quakeResource.retry} compact />}
          <div className="quake-summary-grid"><div><span>Past 24 hours</span><strong>{quakeResource.state.data?.count ?? "—"}</strong></div><div><span>Within 1,000 km</span><strong>{quakeResource.state.data ? localQuakes.length : "—"}</strong></div><div><span>Largest nearby</span><strong>{largestLocalQuake?.magnitude === null || largestLocalQuake?.magnitude === undefined ? "—" : `M${largestLocalQuake.magnitude.toFixed(1)}`}</strong></div></div>
          {!quakeResource.state.data ? <ResourceMessage status={quakeResource.state.status} error={quakeResource.state.error} onRetry={quakeResource.retry} compact /> : earthquakes.length === 0 ? <div className="empty-inline">No events were returned in this USGS feed window.</div> : <div className="quake-list">{earthquakes.slice(0, 4).map((event) => <a href={event.url} target="_blank" rel="noreferrer" className="quake-row" key={event.id}><span className={`magnitude-chip ${Number(event.magnitude) >= 5 ? "magnitude-high" : ""}`}>{event.magnitude === null ? "—" : event.magnitude.toFixed(1)}</span><span className="quake-place"><strong>{event.place}</strong><small>{formatDateTime(event.time)}</small></span><ExternalLink size={14} /></a>)}</div>}
          {nearestQuake && <div className="nearest-quake"><MapPin size={14} /><span>Nearest feed event: {Math.round(nearestQuake.distance).toLocaleString()} km from selected location. Distance is approximate.</span></div>}
        </section>
      </div>
      <section className="notice-strip"><Info size={17} /><span>Safeguard supports awareness and preparation; feeds may be incomplete or delayed. Always follow local official instructions and emergency services.</span><button type="button" onClick={() => setActiveView("sources")}>View sources</button></section>
    </>
  );

  const renderWeather = () => (
    <>
      <SectionIntro eyebrow="WEATHER & AIR QUALITY" title={`Weather in ${location.name}`} description="Conditions and outlook from Open-Meteo. Weather values are model-based; they are not official warnings." />
      <div className="home-feature-grid"><WeatherHero location={location} state={weatherResource.state} advisories={advisories} onRetry={weatherResource.retry} /><AirQualityCard state={airResource.state} onRetry={airResource.retry} detailed /></div>
      <div className="dashboard-grid dashboard-grid-two weather-charts-grid">
        <section className="card chart-card"><CardHeading eyebrow="NEXT 24 HOURS" title="Temperature & precipitation" aside={<span className="forecast-label">FORECAST</span>} />
          {!weather ? <ResourceMessage status={weatherResource.state.status} error={weatherResource.state.error} onRetry={weatherResource.retry} /> : <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weather.hourly.time.slice(0, 24).map((time, index) => ({ time, temperature: weather.hourly.temperature_2m[index], precipitation: weather.hourly.precipitation[index], probability: weather.hourly.precipitation_probability[index] }))} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#567ff0" stopOpacity={0.18} /><stop offset="95%" stopColor="#567ff0" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e9edf3" vertical={false} /><XAxis dataKey="time" tickFormatter={(value: string) => new Date(value).toLocaleTimeString([], { hour: "numeric" })} interval={3} tick={{ fontSize: 11, fill: "#8691a3" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8691a3" }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(value) => formatDateTime(String(value))} contentStyle={{ borderRadius: 12, borderColor: "#e5eaf1", boxShadow: "0 8px 24px rgba(20,35,65,.09)" }} /><Area type="monotone" dataKey="temperature" name="Temperature °C" stroke="#5277df" strokeWidth={2.5} fill="url(#temperatureFill)" /><Line type="monotone" dataKey="probability" name="Rain chance %" stroke="#39a4a0" strokeWidth={2} dot={false} /></AreaChart></ResponsiveContainer></div>}
          <div className="chart-legend"><span><i className="legend-line legend-temperature" />Temperature</span><span><i className="legend-line legend-precipitation" />Rain chance</span><small>FORECAST · Open-Meteo</small></div>
        </section>
        <section className="card weather-detail-card"><CardHeading eyebrow="CURRENT MODEL CONDITIONS" title="Atmospheric details" />{weather ? <div className="detail-metric-grid"><div className="detail-metric"><span className="detail-metric-icon"><Thermometer size={16} /></span><span>Feels like</span><strong>{Math.round(weather.current.apparent_temperature)}°C</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Droplets size={16} /></span><span>Humidity</span><strong>{Math.round(weather.current.relative_humidity_2m)}%</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Wind size={16} /></span><span>Wind gusts</span><strong>{Math.round(weather.current.wind_gusts_10m)} km/h</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Gauge size={16} /></span><span>Pressure</span><strong>{Math.round(weather.current.pressure_msl)} hPa</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Eye size={16} /></span><span>Visibility</span><strong>{weather.current.visibility >= 1000 ? `${(weather.current.visibility / 1000).toFixed(1)} km` : `${Math.round(weather.current.visibility)} m`}</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Sun size={16} /></span><span>UV index</span><strong>{weather.current.uv_index.toFixed(1)}</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Cloud size={16} /></span><span>Cloud cover</span><strong>{Math.round(weather.current.cloud_cover)}%</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Navigation size={16} /></span><span>Wind direction</span><strong>{Math.round(weather.current.wind_direction_10m)}°</strong></div><div className="detail-metric"><span className="detail-metric-icon"><CloudRain size={16} /></span><span>Snowfall</span><strong>{weather.current.snowfall.toFixed(1)} cm</strong></div><div className="detail-metric"><span className="detail-metric-icon"><Clock3 size={16} /></span><span>Sunrise</span><strong>{weather.daily.sunrise[0] ? new Date(weather.daily.sunrise[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</strong></div></div> : <ResourceMessage status={weatherResource.state.status} error={weatherResource.state.error} onRetry={weatherResource.retry} />}</section>
      </div>
      <section className="card outlook-card outlook-full"><CardHeading eyebrow="7-DAY OUTLOOK" title="Daily forecast" aside={<span className="forecast-label">FORECAST · OPEN-METEO</span>} /><WeatherOutlook weather={weather} state={weatherResource.state} onRetry={weatherResource.retry} /></section>
      <section className="card advisory-method"><Info size={17} /><div><strong>Safeguard application advisories</strong><p>Heuristics only: rainfall ≥20 mm/hour, wind gusts ≥60 km/h, temperature ≥40°C, visibility &lt;1 km, thunderstorm weather code, or US AQI ≥151. These thresholds are not government warnings. Check official local guidance.</p></div></section>
    </>
  );

  const renderMap = () => (
    <>
      <SectionIntro eyebrow="LIVE MONITORING" title="Disaster map" description="Independent event layers on an OpenStreetMap base. Event coverage is source-specific and does not imply complete risk coverage." />
      <div className="map-page-grid">
        <section className="card map-workspace-card"><div className="map-workspace-head"><div><span className="eyebrow">BASE MAP · OPENSTREETMAP</span><h2>{locationDisplay}</h2><p>Earthquakes, NASA EONET events, and GDACS events are independent overlays.</p></div><StatusLabel tone="success">Base map enabled</StatusLabel></div><div className="map-workspace"><MonitoringMap location={location} earthquakes={earthquakes} naturalEvents={naturalEvents} gdacsEvents={gdacsEvents} layers={layers} weatherData={weatherResource.state.data} /></div><div className="map-foot-legend"><span><i className="legend-dot legend-quake" />USGS earthquakes ({quakeResource.state.data?.count ?? "—"})</span><span><i className="legend-dot legend-eonet" />NASA EONET ({eventResource.state.data?.count ?? "—"})</span><span><i className="legend-dot legend-gdacs" />GDACS ({gdacsResource.state.data?.count ?? "—"})</span><small>OpenStreetMap contributors · zoom 2–19</small></div></section>
        <aside className="map-side-column"><section className="card layer-card"><CardHeading eyebrow="MAP CONTROLS" title="Layers" /><div className="layer-always"><span className="base-layer-symbol"><MapIcon size={17} /></span><div><strong>Base map</strong><small>OpenStreetMap · always on</small></div><span className="base-layer-on">ON</span></div>
            <LayerToggle title="Earthquakes" detail="USGS event feed" active={layers.earthquakes} onClick={() => setLayers((value) => ({ ...value, earthquakes: !value.earthquakes }))} />
            <LayerToggle title="Natural events" detail="NASA EONET records" active={layers.naturalEvents} onClick={() => setLayers((value) => ({ ...value, naturalEvents: !value.naturalEvents }))} />
            <LayerToggle title="Disaster events" detail="GDACS alert levels" active={layers.gdacs} onClick={() => setLayers((value) => ({ ...value, gdacs: !value.gdacs }))} />
            <LayerToggle title="Weather overlay" detail="No radar provider configured" active={false} onClick={() => undefined} disabled badge="Unavailable" />
            <LayerToggle title="Fire hotspots" detail="FIRMS key and map proxy required" active={false} onClick={() => undefined} disabled badge="Optional" />
            <p className="layer-note">A feed error never removes the base map or other active layers.</p>
          </section>
          <section className="card map-feed-card"><CardHeading eyebrow="FEED HEALTH" title="Independent sources" />{[
            { name: "USGS earthquakes", state: quakeResource.state },
            { name: "NASA EONET", state: eventResource.state },
            { name: "GDACS", state: gdacsResource.state },
          ].map((item) => <div className="feed-health-row" key={item.name}><span className={`feed-health-dot feed-health-${item.state.status}`} /><span><strong>{item.name}</strong><small>{item.state.status === "success" ? `Checked ${formatCheckedAt(item.state.updatedAt)}` : item.state.status === "error" ? "Unavailable · retry independently" : item.state.status === "stale" ? "Showing last available data" : "Checking source"}</small></span><button className="icon-button icon-button-small" type="button" aria-label={`Retry ${item.name}`} onClick={item.name.startsWith("USGS") ? quakeResource.retry : item.name === "NASA EONET" ? eventResource.retry : gdacsResource.retry}><RefreshCw size={14} /></button></div>)}</section>
        </aside>
      </div>
    </>
  );

  const renderAlerts = () => (
    <>
      <SectionIntro eyebrow="ALERT CENTER" title="Signals, clearly sourced" description="Application advisories, external event records, and official warning availability are kept distinct." />
      <div className="alert-center-grid">
        <div className="alert-center-main">
          <section className="card alert-center-card"><CardHeading eyebrow="APPLICATION ADVISORY" title="Weather-based advisories" aside={<span className="classification-chip chip-advisory">APPLICATION ADVISORY</span>} />
            {weatherResource.state.status === "stale" && <ResourceMessage status="stale" error={weatherResource.state.error} onRetry={weatherResource.retry} compact />}
            {airResource.state.status === "stale" && <ResourceMessage status="stale" error={airResource.state.error} onRetry={airResource.retry} compact />}
            {advisories.length === 0 ? <div className="quiet-state"><span className="quiet-icon"><ShieldCheck size={19} /></span><div><strong>No thresholds met by available weather and AQI data</strong><p>This is not an all-clear. The forecast and air-quality feeds may be delayed or incomplete.</p></div></div> : <div className="alert-list">{advisories.map((item) => <article className="alert-center-item" key={item.id}><span className={`alert-severity alert-severity-${item.severity}`}><AlertTriangle size={16} /></span><div><div className="alert-item-title"><strong>{item.title}</strong><StatusLabel tone={item.severity === "high" ? "danger" : "warning"}>{item.severity}</StatusLabel></div><p>{item.description}</p><div className="alert-meta"><span>Source: {item.source}</span><span>Classification: {item.classification}</span></div></div></article>)}</div>}
            <p className="threshold-footnote">Thresholds are documented in Weather. Safeguard advisories are not official government warnings.</p>
          </section>
          <section className="card alert-center-card"><CardHeading eyebrow="OBSERVED EVENT · USGS" title="Recent earthquakes" aside={<button className="inline-link" type="button" onClick={() => setActiveView("map")}>View on map <ArrowRight size={14} /></button>} />
            {quakeResource.state.status === "stale" && <ResourceMessage status="stale" error={quakeResource.state.error} onRetry={quakeResource.retry} compact />}
            {!quakeResource.state.data ? <ResourceMessage status={quakeResource.state.status} error={quakeResource.state.error} onRetry={quakeResource.retry} /> : earthquakes.length === 0 ? <p className="empty-inline">No earthquakes were returned by this USGS feed window.</p> : <div className="event-table">{earthquakes.slice(0, 8).map((event) => <div className="event-table-row" key={event.id}><span className={`magnitude-chip ${Number(event.magnitude) >= 5 ? "magnitude-high" : ""}`}>{event.magnitude === null ? "—" : event.magnitude.toFixed(1)}</span><span><strong>{event.place}</strong><small>{formatDateTime(event.time)} · Depth {event.coordinates[2]} km</small></span><a className="icon-button icon-button-small" href={event.url} target="_blank" rel="noreferrer" aria-label={`Open USGS details for ${event.title}`}><ExternalLink size={14} /></a></div>)}</div>}
          </section>
          <section className="card alert-center-card"><CardHeading eyebrow="NATURAL EVENT · NASA EONET" title="Natural events" aside={<span className="source-inline">Source: NASA EONET</span>} />
            {eventResource.state.status === "stale" && <ResourceMessage status="stale" error={eventResource.state.error} onRetry={eventResource.retry} compact />}
            {!eventResource.state.data ? <ResourceMessage status={eventResource.state.status} error={eventResource.state.error} onRetry={eventResource.retry} /> : naturalEvents.length === 0 ? <p className="empty-inline">No active events were returned by NASA EONET. EONET does not cover every disaster worldwide.</p> : <div className="event-table">{naturalEvents.slice(0, 8).map((event) => <div className="event-table-row event-row-natural" key={event.id}><span className="event-source-icon event-source-eonet"><Activity size={15} /></span><span><strong>{event.title}</strong><small>{event.category} · {formatDateTime(event.date)}</small></span>{event.url ? <a className="icon-button icon-button-small" href={event.url} target="_blank" rel="noreferrer" aria-label={`Open ${event.title} details`}><ExternalLink size={14} /></a> : <span />}</div>)}</div>}
          </section>
          <section className="card alert-center-card"><CardHeading eyebrow="GDACS EVENT RECORDS" title="Global disaster events" aside={<button type="button" className="icon-button icon-button-small" aria-label="Retry GDACS feed" onClick={gdacsResource.retry}><RefreshCw size={14} /></button>} />
            {gdacsResource.state.status === "stale" && <ResourceMessage status="stale" error={gdacsResource.state.error} onRetry={gdacsResource.retry} compact />}
            {!gdacsResource.state.data ? <ResourceMessage status={gdacsResource.state.status} error={gdacsResource.state.error} onRetry={gdacsResource.retry} /> : gdacsEvents.length === 0 ? <p className="empty-inline">No GDACS event records were returned for the recent 30-day query. This does not indicate an all-clear.</p> : <div className="event-table">{gdacsEvents.slice(0, 8).map((event) => <div className="event-table-row" key={event.id}><span className={`gdacs-level gdacs-level-${event.alertLevel?.toLowerCase() ?? "unknown"}`}>{event.alertLevel ?? "EVENT"}</span><span><strong>{event.title}</strong><small>{event.eventType} · {event.country ?? "Location not provided"} · {formatDateTime(event.date)}</small></span>{event.url ? <a className="icon-button icon-button-small" href={event.url} target="_blank" rel="noreferrer" aria-label={`Open GDACS details for ${event.title}`}><ExternalLink size={14} /></a> : <span />}</div>)}</div>}
          </section>
        </div>
        <aside className="alert-center-aside"><section className="card official-status-card"><span className="official-status-icon"><Info size={19} /></span><span className="eyebrow">OFFICIAL WARNING FEED</span><h2>Feed unavailable</h2><p>No NDMA/SACHET, IMD, CWC or INCOIS warning feed is connected in this deployment. Check official services directly for location-specific instructions.</p><div className="official-links"><a href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer">NDMA SACHET <ExternalLink size={13} /></a><a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">India Meteorological Department <ExternalLink size={13} /></a><a href="https://incois.gov.in/" target="_blank" rel="noreferrer">INCOIS <ExternalLink size={13} /></a></div></section>
          <section className="card humanitarian-card"><CardHeading eyebrow="RELIEFWEB" title="Humanitarian reports" aside={<BookOpen size={16} className="heading-icon" />} /><p className="humanitarian-note">Context reports only. These are not sensor observations or official local warnings.</p>{!reportResource.state.data ? <ResourceMessage status={reportResource.state.status} error={reportResource.state.error} onRetry={reportResource.retry} compact /> : reports.length === 0 ? <p className="empty-inline">No report records were returned.</p> : <div className="report-list">{reports.map((report) => <a className="report-row" href={report.url ?? "https://reliefweb.int/"} target="_blank" rel="noreferrer" key={report.id}><strong>{report.title}</strong><small>{report.countries.join(", ") || "Country not listed"} · {report.date ? formatDateTime(report.date) : "Date not provided"}</small></a>)}</div>}
          </section>
        </aside>
      </div>
    </>
  );

  const startDate = `${startYear}-01-01`;
  const endDate = endYear === new Date().getFullYear() ? new Date().toISOString().slice(0, 10) : `${endYear}-12-31`;
  const historicEvents = useMemo(() => {
    const events = disasterHistoryResource.state.data?.events ?? [];
    return events.filter((event) => {
      if (!event.coordinates || !event.date) return false;
      return distanceKm([location.latitude, location.longitude], [event.coordinates[1], event.coordinates[0]]) <= 500;
    });
  }, [disasterHistoryResource.state.data, location.latitude, location.longitude]);

  const historicalByYear = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of historicEvents) {
      const year = event.date?.slice(0, 4);
      if (year) counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    return [...counts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => Number(a.year) - Number(b.year));
  }, [historicEvents]);

  const historicalByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of historicEvents) counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [historicEvents]);

  const historicalBySeason = useMemo(() => {
    const counts = new Map<string, number>([["Winter", 0], ["Spring", 0], ["Summer", 0], ["Autumn", 0]]);
    for (const event of historicEvents) {
      const month = Number(event.date?.slice(5, 7));
      const season = month === 12 || month <= 2 ? "Winter" : month <= 5 ? "Spring" : month <= 8 ? "Summer" : "Autumn";
      if (month) counts.set(season, (counts.get(season) ?? 0) + 1);
    }
    return [...counts.entries()].map(([season, count]) => ({ season, count }));
  }, [historicEvents]);

  const historicNearest = useMemo(() => historicEvents.reduce<{ event: NaturalEvent; distance: number } | null>((nearest, event) => {
    if (!event.coordinates) return nearest;
    const distance = distanceKm([location.latitude, location.longitude], [event.coordinates[1], event.coordinates[0]]);
    return !nearest || distance < nearest.distance ? { event, distance } : nearest;
  }, null), [historicEvents, location.latitude, location.longitude]);

  const historicalWeatherDays = weatherHistoryResource.state.data?.days ?? [];
  const weatherChartData = useMemo(() => {
    const groups = new Map<string, { sum: number; count: number }>();
    for (const day of historicalWeatherDays) {
      const monthNumber = Number(day.date.slice(5, 7));
      const month = new Date(2000, monthNumber - 1, 1).toLocaleString([], { month: "short" });
      const raw = day[weatherMetric] as number | null;
      if (raw === null || !Number.isFinite(raw)) continue;
      const existing = groups.get(month) ?? { sum: 0, count: 0 };
      existing.sum += raw;
      existing.count += 1;
      groups.set(month, existing);
    }
    const monthOrder = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleString([], { month: "short" }));
    return monthOrder.filter((month) => groups.has(month)).map((month) => {
      const value = groups.get(month)!;
      return { month, value: Number((value.sum / value.count).toFixed(1)), days: value.count };
    });
  }, [historicalWeatherDays, weatherMetric]);

  const renderAnalytics = () => (
    <>
      <SectionIntro eyebrow="HISTORICAL ANALYSIS" title="Historical Disaster Explorer" description="Explore recorded NASA EONET event records near your selected location alongside Open-Meteo historical weather reanalysis." />
      <section className="card history-filter-card"><div className="history-filter-heading"><div><span className="eyebrow">LOCATION & TIME WINDOW</span><h2>Explore the record</h2><p>Events within approximately 500 km of {location.name}. Coverage varies by category and reporting source.</p></div><span className="classification-chip chip-historical">HISTORICAL</span></div>
        <form className="history-filter-controls" onSubmit={(event) => { event.preventDefault(); if (startYear > endYear) { setHistoryFilterError("Start year must be earlier than or equal to end year."); return; } setHistoryFilterError(""); setAppliedHistory({ start: startDate, end: endDate, category: hazardCategory }); }}>
          <label className="form-field"><span>Start year</span><select value={startYear} onChange={(event) => setStartYear(Number(event.target.value))}>{Array.from({ length: Math.max(1, new Date().getFullYear() - 1999) }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="form-field"><span>End year</span><select value={endYear} onChange={(event) => setEndYear(Number(event.target.value))}>{Array.from({ length: Math.max(1, new Date().getFullYear() - 1999) }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="form-field"><span>Hazard type</span><select value={hazardCategory} onChange={(event) => setHazardCategory(event.target.value)}><option value="all">All supported categories</option><option value="wildfires">Wildfires</option><option value="severeStorms">Severe storms</option><option value="volcanoes">Volcanoes</option><option value="floods">Floods</option><option value="landslides">Landslides</option><option value="drought">Drought</option><option value="dustHaze">Dust / haze</option></select></label>
          <button type="submit" className="button button-primary"><CalendarDays size={16} />Apply time window</button>
          {historyFilterError && <p className="field-error" role="alert">{historyFilterError}</p>}
        </form>
        <div className="timeline-control"><span>Timeline window</span><input type="range" min="2000" max={new Date().getFullYear()} value={endYear} aria-label="Adjust historical end year" onChange={(event) => setEndYear(Number(event.target.value))} /><span>{startYear} — {endYear}</span></div>
      </section>
      <div className="history-stat-grid"><div className="card history-stat"><span className="history-stat-icon"><Activity size={17} /></span><span>Mapped event records</span><strong>{disasterHistoryResource.state.data ? historicEvents.length : "—"}</strong><small>Within 500 km · NASA EONET</small></div><div className="card history-stat"><span className="history-stat-icon"><CalendarDays size={17} /></span><span>Selected coverage</span><strong>{new Date(appliedHistory.start).getUTCFullYear()}–{new Date(appliedHistory.end).getUTCFullYear()}</strong><small>Current end date: {appliedHistory.end}</small></div><div className="card history-stat"><span className="history-stat-icon"><MapPin size={17} /></span><span>Nearest mapped event</span><strong>{historicNearest ? `${Math.round(historicNearest.distance)} km` : "—"}</strong><small>{historicNearest?.event.title ?? "No located event returned"}</small></div></div>
      <div className="history-results-grid">
        <section className="card history-map-card"><CardHeading eyebrow="NASA EONET · EVENT GEOMETRY" title="Historical event map" aside={<span className="classification-chip chip-historical">HISTORICAL</span>} />
          <div className="history-map-frame"><MonitoringMap location={location} naturalEvents={historicEvents} layers={{ earthquakes: false, naturalEvents: true, gdacs: false }} /></div>
          {disasterHistoryResource.state.status !== "success" && <div className="history-map-message"><ResourceMessage status={disasterHistoryResource.state.status} error={disasterHistoryResource.state.error} onRetry={disasterHistoryResource.retry} /></div>}
          {disasterHistoryResource.state.status === "success" && historicEvents.length === 0 && <div className="history-map-message"><p>No historical data is available for this selection.</p></div>}
          <p className="data-footnote">NASA EONET event coverage varies. The query is spatially bounded and capped at 500 records; records without coordinates are excluded from the mapped count.</p>
        </section>
        <div className="history-chart-stack"><section className="card history-chart-card"><CardHeading eyebrow="EVENT COUNT" title="Events by year" /><div className="chart-frame chart-frame-short">{historicalByYear.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={historicalByYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="#e9edf3" vertical={false} /><XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5eaf1" }} /><Bar dataKey="count" name="Event records" fill="#5477db" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">{disasterHistoryResource.state.status === "loading" ? "Loading historical events…" : "No event records to chart for this selection."}</div>}</div></section>
        <section className="card history-chart-card"><CardHeading eyebrow="CATEGORY COUNTS" title="Events by type" /><div className="chart-frame chart-frame-short">{historicalByCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={historicalByCategory} layout="vertical" margin={{ top: 2, right: 12, left: 8, bottom: 0 }}><CartesianGrid stroke="#e9edf3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="category" width={86} tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5eaf1" }} /><Bar dataKey="count" name="Event records" fill="#42a694" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">No event type records returned.</div>}</div></section>
        <section className="card history-chart-card"><CardHeading eyebrow="SEASONAL DISTRIBUTION" title="By season" /><div className="chart-frame chart-frame-short">{historicalBySeason.some((item) => item.count > 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={historicalBySeason} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="#e9edf3" vertical={false} /><XAxis dataKey="season" tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8691a3" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5eaf1" }} /><Bar dataKey="count" name="Event records" fill="#dc9a50" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">Seasonal counts appear when dated records are available.</div>}</div></section></div>
      </div>
      {disasterHistoryResource.state.data && historicEvents.length > 0 && <section className="card history-records-card"><CardHeading eyebrow="SOURCE RECORDS" title="Events in this selection" aside={<span className="source-inline">NASA EONET · within 500 km</span>} /><div className="event-table">{[...historicEvents].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 12).map((event) => <div className="event-table-row" key={event.id}><span className="event-source-icon event-source-eonet"><Activity size={15} /></span><span><strong>{event.title}</strong><small>{event.category} · {formatDateTime(event.date)}</small></span>{event.url ? <a className="icon-button icon-button-small" href={event.url} target="_blank" rel="noreferrer" aria-label={`Open historical event ${event.title}`}><ExternalLink size={14} /></a> : <span />}</div>)}</div></section>}
      <section className="card historical-weather-card"><div className="history-weather-head"><div><span className="eyebrow">OPEN-METEO ARCHIVE · REANALYSIS</span><h2>Historical weather analysis</h2><p>Historical model reanalysis, not current conditions or a forecast.</p></div><label className="form-field form-field-compact"><span>Year</span><select value={weatherYear} onChange={(event) => setWeatherYear(Number(event.target.value))}>{Array.from({ length: Math.max(1, new Date().getFullYear() - 1939) }, (_, index) => new Date().getFullYear() - 1 - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
        <div className="metric-tab-row" role="group" aria-label="Historical weather chart metric">{([ ["temperature", "Temperature"], ["rainfall", "Rainfall"], ["wind", "Wind"], ["humidity", "Humidity"] ] as const).map(([metric, label]) => <button type="button" key={metric} className={`metric-tab ${weatherMetric === metric ? "metric-tab-active" : ""}`} aria-pressed={weatherMetric === metric} onClick={() => setWeatherMetric(metric)}>{label}</button>)}</div>
        {!weatherHistoryResource.state.data ? <ResourceMessage status={weatherHistoryResource.state.status} error={weatherHistoryResource.state.error} onRetry={weatherHistoryResource.retry} /> : weatherChartData.length === 0 ? <p className="empty-inline">No historical data is available for this selection.</p> : <div className="chart-frame history-weather-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={weatherChartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#e9edf3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8691a3" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8691a3" }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}${weatherMetric === "temperature" ? "°C" : weatherMetric === "rainfall" ? " mm/day" : weatherMetric === "wind" ? " km/h" : "%"}`, `${weatherMetric} monthly average`]} contentStyle={{ borderRadius: 12, borderColor: "#e5eaf1" }} /><Line type="monotone" dataKey="value" name={weatherMetric} stroke="#4f79df" strokeWidth={2.5} dot={{ r: 3, fill: "#4f79df", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>}
        <p className="data-footnote">Monthly chart values are calculated from returned daily archive values: rainfall shows mean daily total within each month; temperature, wind, and humidity show monthly means. Source: {weatherHistoryResource.state.data?.source ?? "Open-Meteo Archive API"}.</p>
      </section>
    </>
  );

  const renderPrepare = () => (
    <>
      <SectionIntro eyebrow="PREPAREDNESS CENTER" title="A little readiness goes a long way" description="Practical before, during, and after steps. Adapt these basics to local official guidance and your household." />
      <section className="prepare-intro-strip"><span className="prepare-intro-icon"><Compass size={19} /></span><div><strong>Start with the essentials</strong><p>Know your risks, keep a way to receive official information, and agree on a household meeting point.</p></div><button type="button" className="inline-link" onClick={() => setActiveView("emergency")}>Emergency information <ArrowRight size={14} /></button></section>
      <div className="guide-grid">{hazardGuides.map((guide) => <details className="card guide-card" key={guide.title}><summary><span className="guide-icon"><guide.icon size={18} /></span><span className="guide-title"><strong>{guide.title}</strong><small>Before · During · After</small></span><ChevronDown size={17} className="guide-chevron" /></summary><div className="guide-content">{([ ["BEFORE", guide.before], ["DURING", guide.during], ["AFTER", guide.after] ] as const).map(([phase, items]) => <div className="guide-phase" key={phase}><span>{phase}</span><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}<a className="official-guidance-link" href="https://ndma.gov.in/" target="_blank" rel="noreferrer">Check official NDMA guidance <ExternalLink size={13} /></a></div></details>)}</div>
      <section className="card kit-card"><div className="kit-header"><div><span className="eyebrow">EMERGENCY KIT</span><h2>Build your essentials</h2><p>Checklist stays on this device in guest mode.</p></div><div className="kit-progress-count"><strong>{kitCount}<span> / {emergencyKitItems.length}</span></strong><small>READY</small></div></div><div className="progress-track" role="progressbar" aria-valuenow={kitCount} aria-valuemin={0} aria-valuemax={emergencyKitItems.length} aria-label={`${kitCount} of ${emergencyKitItems.length} emergency kit items ready`}><span style={{ width: `${(kitCount / emergencyKitItems.length) * 100}%` }} /></div><div className="kit-checklist">{emergencyKitItems.map((item) => <label className={`kit-item ${kitReady[item] ? "kit-item-ready" : ""}`} key={item}><input type="checkbox" checked={kitReady[item] ?? false} onChange={(event) => setKitReady((current) => ({ ...current, [item]: event.target.checked }))} /><span className="kit-checkbox"><Check size={13} /></span><span>{item}</span></label>)}</div><p className="data-footnote">Kit needs vary by household, health needs, local hazards, and evacuation guidance. Check and refresh supplies regularly.</p></section>
    </>
  );

  const renderFirstAid = () => (
    <>
      <SectionIntro eyebrow="FIRST AID REFERENCE" title="Simple steps in a difficult moment" description="Basic reference information only. Call local emergency medical services and follow professional guidance first." />
      <section className="first-aid-critical"><span><HeartPulse size={20} /></span><div><strong>Emergency medical services take priority</strong><p>Call your local emergency number for a life-threatening injury or if you are unsure what to do. Do not put yourself in danger.</p></div><a className="button button-dark" href="tel:112"><PhoneCall size={16} />Call 112</a></section>
      <div className="first-aid-grid">
        <article className="card first-aid-card"><span className="first-aid-icon first-aid-red"><Droplets size={19} /></span><span className="eyebrow">URGENT BLEEDING</span><h2>Severe bleeding</h2><ol><li>Call emergency medical services or ask someone to call.</li><li>Apply firm, continuous direct pressure with clean cloth or dressing.</li><li>If blood soaks through, add more material without lifting the first dressing. Follow dispatcher instructions.</li></ol><p>Do not remove embedded objects; apply pressure around them.</p></article>
        <article className="card first-aid-card"><span className="first-aid-icon first-aid-amber"><Flame size={19} /></span><span className="eyebrow">BURN</span><h2>Burns</h2><ol><li>Move away from the heat source if it is safe to do so.</li><li>Cool the burn with clean, cool running water for 20 minutes when available.</li><li>Remove nearby jewellery or clothing only if it is not stuck to the skin; cover loosely with a clean dressing.</li></ol><p>Do not use ice, butter, or creams on a serious burn. Seek medical help.</p></article>
        <article className="card first-aid-card"><span className="first-aid-icon first-aid-blue"><Activity size={19} /></span><span className="eyebrow">POSSIBLE FRACTURE</span><h2>Fracture or serious injury</h2><ol><li>Call for professional help if the injury is severe or the person is in significant pain.</li><li>Keep the injured area still and supported in the position found.</li><li>Do not straighten a limb or push a bone back into place.</li></ol><p>Check circulation and sensation without moving the injury; follow dispatcher guidance.</p></article>
        <article className="card first-aid-card"><span className="first-aid-icon first-aid-violet"><Eye size={19} /></span><span className="eyebrow">UNRESPONSIVE PERSON</span><h2>Not responding</h2><ol><li>Check the area is safe, speak loudly, and gently tap their shoulders.</li><li>Call emergency medical services and ask someone to bring an AED if available.</li><li>Check breathing. If they are not breathing normally, begin CPR only if trained or follow the emergency dispatcher.</li></ol><p>If breathing normally, keep the airway clear and monitor until help arrives.</p></article>
      </div>
      <section className="card medical-source"><Info size={17} /><div><strong>Learn from qualified sources</strong><p>This short reference is not a substitute for training. Guidance is adapted from general first-aid principles; follow your local emergency dispatcher and professional medical advice.</p><a href="https://www.who.int/news-room/fact-sheets/detail/first-aid" target="_blank" rel="noreferrer">World Health Organization · First aid <ExternalLink size={13} /></a></div></section>
    </>
  );

  const beginSos = () => {
    if (!sosConsent) return;
    if (!navigator.geolocation) {
      setSosResult({ status: "failed", message: "This browser cannot capture a location. Call your local emergency number directly." });
      return;
    }
    setSosBusy(true);
    setSosResult(null);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch("/api/emergency/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
        });
        const result = await response.json() as { error?: string; status?: string; message?: string; incident?: { id?: string; createdAt?: string } };
        if (!response.ok || result.status !== "initiated" || !result.incident?.id) {
          setSosResult({ status: "failed", message: result.error ?? "The request could not be stored. Call your local emergency number directly." });
        } else {
          setSosResult({ status: "initiated", message: "Safeguard stored this incident request. No emergency service or emergency contact was notified.", incidentId: result.incident.id, createdAt: result.incident.createdAt });
        }
      } catch {
        setSosResult({ status: "failed", message: "Safeguard could not reach its incident service. No request was confirmed; call your local emergency number directly." });
      } finally {
        setSosBusy(false);
      }
    }, (error) => {
      setSosBusy(false);
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. No incident was created. Call your local emergency number directly."
        : error.code === error.TIMEOUT
          ? "Location capture timed out. No incident was created. Call your local emergency number directly."
          : "Location is unavailable. No incident was created. Call your local emergency number directly.";
      setSosResult({ status: "failed", message });
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };

  const renderEmergency = () => (
    <>
      <SectionIntro eyebrow="EMERGENCY SUPPORT" title="When every minute matters" description="Use local emergency services first. Number availability and operation can vary by location; verify local services." />
      <section className="emergency-callout"><span className="emergency-callout-icon"><PhoneCall size={19} /></span><div><span className="eyebrow-light">IMMEDIATE DANGER?</span><h2>Call local emergency services now.</h2><p>Safeguard does not dispatch responders. Do not wait for an app if someone is in danger.</p></div><a className="button button-light" href="tel:112"><PhoneCall size={17} />Call 112</a></section>
      <section className="card emergency-number-card"><CardHeading eyebrow="COMMONLY USED INDIA NUMBERS" title="Emergency numbers" aside={<span className="source-inline">Verify local availability</span>} /><div className="emergency-number-grid">{[
        { number: "112", name: "Emergency", detail: "Pan-India emergency response" },
        { number: "101", name: "Fire", detail: "Fire and rescue services" },
        { number: "108", name: "Ambulance", detail: "Emergency medical response" },
        { number: "100", name: "Police", detail: "Police assistance" },
      ].map((item) => <div className="emergency-number-tile" key={item.number}><span className="number-icon"><PhoneCall size={16} /></span><div><strong>{item.number}</strong><span>{item.name}</span><small>{item.detail}</small></div><a href={`tel:${item.number}`} aria-label={`Call ${item.name}, ${item.number}`} className="number-call"><PhoneCall size={16} /></a></div>)}</div><p className="data-footnote">These are commonly used India numbers; availability and routing can vary by region and network. Confirm the correct number for your location.</p></section>
      <section className="card sos-card"><div className="sos-card-copy"><span className="eyebrow">OPTIONAL INCIDENT RECORD</span><h2>Safeguard SOS request</h2><p>This deployment can store a confirmed incident with your precise location. It does <strong>not</strong> notify emergency services or contacts. For help, call a local emergency number directly.</p><div className="sos-flow"><span><CheckCircle2 size={15} />Confirmation</span><ChevronRight size={14} /><span><LocateFixed size={15} />Location permission</span><ChevronRight size={14} /><span><Database size={15} />Database record</span><ChevronRight size={14} /><span className="sos-not-configured">No delivery provider</span></div></div><button type="button" className="button button-danger" onClick={() => { setSosConsent(false); setSosDialog(true); }}><AlertTriangle size={16} />Review SOS workflow</button>
        {sosResult && <div className={`sos-result sos-result-${sosResult.status}`} role="status"><span>{sosResult.status === "initiated" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span><div><strong>{sosResult.status === "initiated" ? "SOS initiated · incident recorded" : "SOS failed · no confirmed incident"}</strong><p>{sosResult.message}</p>{sosResult.incidentId && <small>Incident ID {sosResult.incidentId} · {formatDateTime(sosResult.createdAt)}</small>}</div></div>}
      </section>
      <section className="emergency-bottom-grid"><div className="card emergency-guidance-card"><span className="emergency-small-icon"><MapPin size={18} /></span><h2>Know your local plan</h2><p>Emergency numbers, shelters, and evacuation procedures differ by location. Check official local authorities and keep paper contact details available.</p><a href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer">Open NDMA SACHET <ExternalLink size={13} /></a></div><div className="card emergency-guidance-card"><span className="emergency-small-icon"><BookOpen size={18} /></span><h2>Keep essential information close</h2><p>Share your household plan with trusted people, keep medicines and documents accessible, and know how to contact one another if networks are interrupted.</p><button className="inline-link" type="button" onClick={() => setActiveView("prepare")}>Open preparedness center <ArrowRight size={14} /></button></div></section>
      {sosDialog && <AppDialog title="Confirm Safeguard SOS request" onClose={() => { if (!sosBusy) setSosDialog(false); }}><div className="sos-dialog-body"><div className="sos-dialog-warning"><AlertTriangle size={20} /><p><strong>This will not contact responders.</strong> Safeguard can only record an incident in its database. No emergency service or contact is configured to receive it. For immediate help, call local emergency services now.</p></div><div className="sos-location-preview"><MapPin size={16} /><span>Current selected location: <strong>{locationDisplay}</strong></span><small>Precise location permission will be requested only after you confirm below.</small></div><label className="consent-check"><input type="checkbox" checked={sosConsent} onChange={(event) => setSosConsent(event.target.checked)} /><span>I understand this request is only stored by Safeguard and does not dispatch help. I want to continue.</span></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setSosDialog(false)} disabled={sosBusy}>Cancel</button><button type="button" className="button button-danger" disabled={!sosConsent || sosBusy} onClick={beginSos}>{sosBusy ? <><RefreshCw size={15} className="spin-icon" />Capturing location…</> : <><LocateFixed size={15} />Capture location & record</>}</button></div></div></AppDialog>}
    </>
  );

  const renderSources = () => {
    const stateFor = (key: string): ResourceState<unknown> | undefined => {
      if (key === "weather") return weatherResource.state;
      if (key === "earthquakes") return quakeResource.state;
      if (key === "events") return eventResource.state;
      if (key === "gdacs") return gdacsResource.state;
      if (key === "reliefweb") return reportResource.state;
      return undefined;
    };
    return (
      <>
        <SectionIntro eyebrow="DATA TRANSPARENCY" title="Sources & limitations" description="Every external-data feature is labeled by source. Availability, coverage, and update cadence belong to the provider." />
        <section className="source-transparency"><span className="source-transparency-icon"><Info size={18} /></span><div><strong>No official warning feed is connected.</strong><p>Official Indian services are linked below. Safeguard weather thresholds are application advisories, not government alerts. Never treat missing feed data as an all-clear.</p></div></section>
        <div className="source-directory">{sourceDirectory.map((source) => {
          const state = stateFor(source.key);
          const disabled = source.key === "firms" || source.key === "official";
          const stateTone = disabled ? "warning" : state?.status === "success" ? "success" : state?.status === "error" ? "danger" : state?.status === "stale" ? "warning" : "neutral";
          const stateText = source.key === "firms" ? "Optional · disabled" : source.key === "official" ? "Official link · no live feed" : source.key === "map" ? "Base map" : source.key === "reliefweb" && state?.status === "error" && state.error?.toLowerCase().includes("pre-approved") ? "Requires approved app name" : state?.status === "success" ? "Checked this session" : state?.status === "error" ? "Unavailable" : state?.status === "stale" ? "Last data retained" : state?.status === "loading" ? "Checking" : "Not yet checked";
          return <article className="card source-card" key={source.name}><div className="source-card-top"><span className={`source-logo source-logo-${source.key}`}>{source.key === "weather" ? <CloudSun size={18} /> : source.key === "earthquakes" ? <Activity size={18} /> : source.key === "events" ? <Activity size={18} /> : source.key === "gdacs" ? <AlertTriangle size={18} /> : source.key === "firms" ? <Flame size={18} /> : source.key === "reliefweb" ? <BookOpen size={18} /> : source.key === "map" ? <MapIcon size={18} /> : <ShieldCheck size={18} />}</span><StatusLabel tone={stateTone}>{stateText}</StatusLabel></div><h2>{source.name}</h2><p>{source.provides}</p><div className="source-card-meta"><span>Last successful update</span><SourceUpdate state={state} /></div><a href={source.url} target="_blank" rel="noreferrer" className="source-link">Official source <ExternalLink size={13} /></a></article>;
        })}</div>
        <section className="card threshold-reference"><CardHeading eyebrow="APPLICATION ADVISORY METHOD" title="Safeguard thresholds" aside={<span className="classification-chip chip-advisory">NOT OFFICIAL</span>} /><p>Heuristics are generated only when returned Open-Meteo data meets one of these rules:</p><div className="threshold-grid"><span>Hourly rainfall <strong>≥ 20 mm</strong></span><span>Wind gusts <strong>≥ 60 km/h</strong></span><span>Temperature <strong>≥ 40°C</strong></span><span>Visibility <strong>&lt; 1 km</strong></span><span>US AQI <strong>≥ 151</strong></span><span>Thunderstorm <strong>weather code ≥ 95</strong></span></div><p className="data-footnote">These rules are application-defined and are not calibrated to every locality. Check the official warning source for your area.</p></section>
        <section className="card configuration-note"><Database size={17} /><div><strong>Optional configuration</strong><p>FIRMS map keys and ReliefWeb’s pre-approved app name are server-side environment values. Neither is exposed to browser code. Authentication is not configured; guest use is available.</p><code>FIRMS_MAP_KEY · RELIEFWEB_APPNAME</code></div></section>
      </>
    );
  };

  const activeContent = view === "home" ? renderHome()
    : view === "weather" ? renderWeather()
      : view === "map" ? renderMap()
        : view === "alerts" ? renderAlerts()
          : view === "analytics" ? renderAnalytics()
            : view === "prepare" ? renderPrepare()
              : view === "first-aid" ? renderFirstAid()
                : view === "emergency" ? renderEmergency()
                  : renderSources();

  return (
    <div className="safeguard-app">
      <aside className={`app-sidebar ${mobileNavOpen ? "app-sidebar-open" : ""}`} aria-label="Primary navigation">
        <div className="brand-lockup"><span className="brand-mark"><ShieldCheck size={22} strokeWidth={2.2} /></span><span><strong>SAFEGUARD</strong><small>Awareness · Preparedness</small></span></div>
        <div className="sidebar-section-label">MONITOR</div>
        <nav className="sidebar-nav">{navItems.slice(0, 5).map((item) => <button type="button" className={`nav-item ${view === item.id ? "nav-item-active" : ""}`} onClick={() => setActiveView(item.id)} key={item.id} aria-current={view === item.id ? "page" : undefined}><item.icon size={18} /><span>{item.label}</span>{item.id === "alerts" && advisories.length > 0 && <span className="nav-count" aria-label={`${advisories.length} application advisories`}>{advisories.length}</span>}</button>)}</nav>
        <div className="sidebar-section-label sidebar-section-label-lower">GET READY</div>
        <nav className="sidebar-nav">{navItems.slice(5).map((item) => <button type="button" className={`nav-item ${view === item.id ? "nav-item-active" : ""}`} onClick={() => setActiveView(item.id)} key={item.id} aria-current={view === item.id ? "page" : undefined}><item.icon size={18} /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-source-icon"><Activity size={15} /></div><div><strong>Data-aware by design</strong><small>Sources checked independently</small></div><span className="sidebar-bottom-dot" /></div>
        <div className="sidebar-footer">Safeguard is an awareness tool.<br />Not a substitute for emergency services.</div>
      </aside>
      {mobileNavOpen && <button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <div className="app-main-shell">
        <header className="topbar">
          <button type="button" className="mobile-menu-button icon-button" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="mobile-brand"><span className="brand-mark"><ShieldCheck size={18} /></span><strong>SAFEGUARD</strong></div>
          <div className="topbar-page-title"><span className="topbar-eyebrow">DISASTER AWARENESS</span><strong>{currentPage}</strong></div>
          <div className="topbar-right">
            <div className="topbar-date">{currentTime ? currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""}</div>
            <div className="location-search-wrap">
              <div className="location-search-box"><Search size={16} /><input type="search" aria-label="Search for a city, region, or country" placeholder={location.name} value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setShowSearchResults(true); }} onFocus={() => setShowSearchResults(true)} onKeyDown={(event) => { if (event.key === "Escape") { setShowSearchResults(false); setLocationQuery(""); } }} /><button type="button" className="location-detect-button" aria-label="Use current location" title="Use current location" disabled={locationBusy} onClick={detectLocation}>{locationBusy ? <RefreshCw size={15} className="spin-icon" /> : <LocateFixed size={16} />}</button></div>
              {showSearchResults && locationQuery.trim().length >= 2 && <div className="location-results" role="listbox" aria-label="Location results">{searchState === "loading" ? <div className="location-result-message">Searching locations…</div> : searchState === "error" ? <div className="location-result-message">Location search unavailable. Try again.</div> : locationResults.length === 0 ? <div className="location-result-message">No matching places returned.</div> : locationResults.map((result) => <button type="button" className="location-result" role="option" aria-selected="false" key={`${result.id ?? result.name}-${result.latitude}`} onClick={() => chooseLocation(result)}><MapPin size={15} /><span><strong>{result.name}</strong><small>{[result.admin1, result.country].filter(Boolean).join(", ")}</small></span></button>)}</div>}
            </div>
            <button type="button" className="account-button" onClick={() => setAccountDialog(true)}><span className="account-avatar">{profile ? profile.full_name.charAt(0).toUpperCase() : "G"}</span><span>{profile ? profile.full_name.split(" ")[0] : "Guest"}</span><ChevronDown size={14} /></button>
            <button type="button" className="header-refresh-button icon-button" aria-label="Refresh data feeds" title="Refresh all data feeds" onClick={refreshAll}><RefreshCw size={16} /></button>
          </div>
        </header>
        {notice && <div className="app-notice" role="status" aria-live="polite"><Info size={16} /><span>{notice}</span><button type="button" className="icon-button icon-button-small" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={14} /></button></div>}
        <main className="app-content" id="main-content">{activeContent}</main>
        <footer className="app-footer"><span>© {new Date().getFullYear()} Safeguard · Data with context, not certainty.</span><span><button type="button" onClick={() => setActiveView("sources")}>Sources</button><span>·</span><button type="button" onClick={() => setActiveView("prepare")}>Preparedness</button></span></footer>
      </div>
      {accountDialog && <AppDialog title={profile ? "Your account" : "Safeguard guest mode"} onClose={() => setAccountDialog(false)}><div className="account-dialog-body"><span className="account-dialog-icon"><ShieldCheck size={22} /></span><h3>{profile ? profile.full_name : "Guest mode"}</h3><p>{profile ? profile.email : "Your location and kit checklist are saved locally on this device."}</p>{profile && <div className="account-profile-grid"><div><span>Account</span><strong>{profile.email}</strong></div>{profile.age && <div><span>Age</span><strong>{profile.age}</strong></div>}{profile.contact_number && <div><span>Contact</span><strong>{profile.contact_number}</strong></div>}{profile.address && <div><span>Address</span><strong>{profile.address}</strong></div>}</div>}<div className="dialog-actions">{profile ? <><button type="button" className="button button-secondary" onClick={() => setAccountDialog(false)}>Close</button><button type="button" className="button button-danger" onClick={async () => { setAccountDialog(false); await logout(); }}>Sign out</button></> : <button type="button" className="button button-primary button-full" onClick={() => setAccountDialog(false)}>Continue as guest</button>}</div></div></AppDialog>}
    </div>
  );
}
