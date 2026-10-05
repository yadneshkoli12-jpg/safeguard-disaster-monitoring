"use client";

import { Cloud, Droplets, MapPin, Wind } from "lucide-react";
import type { ApplicationAdvisory, ResourceState, UserLocation, WeatherData } from "@/types/safeguard";
import ResourceMessage from "@/components/ui/ResourceMessage";
import { weatherAtmosphere, weatherDescription, WeatherSymbol } from "@/components/weather/weather-code";
import { formatNumber, formatWithUnit } from "@/utils/format";

type Props = {
  location: UserLocation;
  state: ResourceState<WeatherData>;
  advisories: ApplicationAdvisory[];
  onRetry: () => void;
};

function clockTime(value?: string) {
  if (!value) return "Local time unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value.replace("T", " ") : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function WeatherHero({ location, state, advisories, onRetry }: Props) {
  const weather = state.data;
  if (!weather) {
    return (
      <section className="weather-hero weather-hero-unavailable" aria-label="Current weather">
        <div className="hero-topline"><span className="eyebrow-light"><span className="status-dot status-dot-muted" /> FORECAST · OPEN-METEO</span><span className="hero-location"><MapPin size={14} />{location.name}{location.country ? `, ${location.country}` : ""}</span></div>
        <div className="weather-empty-wrap">
          <WeatherSymbol code={2} size={44} />
          <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} />
        </div>
      </section>
    );
  }

  const current = weather.current;
  const atmosphere = weatherAtmosphere(current.weather_code, current.is_day === 1);
  // atmosphere may be a single word ("clear") or compound ("night rain")
  const atmosphereClasses = atmosphere.split(" ").map((a) => `atmosphere-${a}`).join(" ");
  const currentAdvisory = advisories[0];

  return (
    <section className={`weather-hero ${atmosphereClasses}`} aria-label="Current weather">
      <div className="weather-backdrop" aria-hidden="true"><span className="atmosphere-orb" /><span className="atmosphere-cloud atmosphere-cloud-one" /><span className="atmosphere-cloud atmosphere-cloud-two" /></div>
      <div className="weather-hero-content">
        <div className="hero-topline">
          <span className="eyebrow-light"><span className={`status-dot ${state.status === "stale" ? "status-dot-stale" : ""}`} />{state.status === "stale" ? "LAST AVAILABLE · FORECAST SOURCE" : "CURRENT CONDITIONS · FORECAST SOURCE"}</span>
          <span className="hero-location"><MapPin size={14} />{location.name}{location.country ? `, ${location.country}` : ""}</span>
        </div>
        <div className="hero-main-row">
          <div className="hero-temperature-block">
            <span className="hero-temperature">{formatNumber(current.temperature_2m)}{Number.isFinite(current.temperature_2m) && <span>°</span>}</span>
            <div className="hero-condition-copy">
              <span className="hero-condition">{weatherDescription(current.weather_code)}</span>
              <span className="hero-feels">Feels like {formatWithUnit(current.apparent_temperature, "°")}</span>
            </div>
          </div>
          <div className="hero-weather-icon"><WeatherSymbol code={current.weather_code} isDay={current.is_day === 1} size={76} /></div>
        </div>
        <div className="hero-bottom-row">
          <div className="hero-stat"><Droplets size={16} /><span><strong>{formatWithUnit(current.relative_humidity_2m, "%")}</strong><small>Humidity</small></span></div>
          <div className="hero-stat"><Wind size={16} /><span><strong>{formatWithUnit(current.wind_speed_10m, weather.units.wind)}</strong><small>Wind</small></span></div>
          <div className="hero-stat"><Cloud size={16} /><span><strong>{formatWithUnit(current.precipitation, weather.units.precipitation, 1)}</strong><small>Rainfall</small></span></div>
          <div className="hero-updated">Local time {clockTime(current.time)}</div>
        </div>
        {state.status === "stale" && <div className="hero-stale-note" role="status">Showing last available source data. Retry the weather feed to check for updates.</div>}
        {currentAdvisory && (
          <div className={`hero-advisory advisory-${currentAdvisory.severity}`} role="status">
            <span className="advisory-mark">!</span>
            <div><strong>{currentAdvisory.title}</strong><span>{currentAdvisory.description}</span><small>APPLICATION ADVISORY · {currentAdvisory.source}</small></div>
          </div>
        )}
      </div>
    </section>
  );
}
