"use client";

import { ArrowRight, Gauge } from "lucide-react";
import type { AirQualityData, ResourceState } from "@/types/safeguard";
import ResourceMessage from "@/components/ui/ResourceMessage";
import { formatWithUnit } from "@/utils/format";

type Props = { state: ResourceState<AirQualityData>; onRetry: () => void; detailed?: boolean; onDetails?: () => void };

export default function AirQualityCard({ state, onRetry, detailed = false, onDetails }: Props) {
  const data = state.data?.current;
  const aqi = data?.us_aqi;
  const summary = aqi === null || aqi === undefined
    ? { label: "AQI unavailable", tone: "neutral", guidance: "No index value was returned by the air-quality source." }
    : aqi <= 50
      ? { label: "Good", tone: "good", guidance: "Air quality is good on the US AQI scale." }
      : aqi <= 100
        ? { label: "Moderate", tone: "moderate", guidance: "Sensitive people may notice effects; follow local health guidance." }
        : aqi <= 150
          ? { label: "Sensitive groups", tone: "sensitive", guidance: "People sensitive to air pollution may limit prolonged outdoor exertion." }
          : aqi <= 200
            ? { label: "Unhealthy", tone: "unhealthy", guidance: "Consider reducing prolonged outdoor exertion and follow local health advice." }
            : aqi <= 300
              ? { label: "Very unhealthy", tone: "very-unhealthy", guidance: "Reduce outdoor exposure and follow local health advice." }
              : { label: "Hazardous", tone: "hazardous", guidance: "Avoid outdoor exposure where possible and follow local health guidance." };

  return (
    <section className="card air-quality-component">
      <div className="card-heading"><div><span className="eyebrow">AIR QUALITY</span><h2>Air around you</h2></div><span className="card-icon"><Gauge size={16} /></span></div>
      {data && state.status === "stale" && <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} compact />}
      {!data ? <ResourceMessage status={state.status} error={state.error} onRetry={onRetry} compact /> : <div className="aqi-card-inner">
        <div className="aqi-score-row"><div className={`aqi-score aqi-${summary.tone}`}>{aqi ?? "—"}<span>US AQI</span></div><div className="aqi-summary-copy"><span className={`status-label ${aqi === null || aqi === undefined ? "" : aqi > 150 ? "status-label-danger" : aqi > 100 ? "status-label-warning" : "status-label-success"}`}><span className="status-label-dot" />{summary.label}</span><p>{summary.guidance}</p><small>FORECAST · {state.data?.source}</small></div></div>
        <div className="aqi-meter" role="img" aria-label={aqi === null || aqi === undefined ? "Air quality index unavailable" : `US air quality index ${aqi}`}><span style={{ left: `${Math.min(100, Math.max(2, (aqi ?? 0) / 3))}%`, visibility: aqi === null || aqi === undefined ? "hidden" : "visible" }} /></div>
        <div className="aqi-secondary"><div><span>PM2.5</span><strong>{formatWithUnit(data.pm2_5, "μg/m³", 1)}</strong></div><div><span>PM10</span><strong>{formatWithUnit(data.pm10, "μg/m³", 1)}</strong></div><div><span>European AQI</span><strong>{data.european_aqi ?? "—"}</strong></div></div>
        {detailed && <div className="pollutant-grid"><div><span>NO₂</span><strong>{formatWithUnit(data.nitrogen_dioxide, "μg/m³", 1)}</strong></div><div><span>SO₂</span><strong>{formatWithUnit(data.sulphur_dioxide, "μg/m³", 1)}</strong></div><div><span>O₃</span><strong>{formatWithUnit(data.ozone, "μg/m³", 1)}</strong></div><div><span>UV index</span><strong>{data.uv_index ?? "—"}</strong></div></div>}
        <p className="data-footnote">Open-Meteo air-quality model. Not a substitute for official public-health advice.</p>
      </div>}
      {onDetails && <div className="card-bottom-link"><span>Model data · not a public-health warning</span><button type="button" className="inline-link" onClick={onDetails}>Details <ArrowRight size={14} /></button></div>}
    </section>
  );
}
