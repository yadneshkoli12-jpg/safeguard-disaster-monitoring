"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { EarthquakeEvent, GdacsEvent, NaturalEvent, UserLocation, WeatherData } from "@/types/safeguard";

export type MapLayerState = {
  earthquakes: boolean;
  naturalEvents: boolean;
  gdacs: boolean;
  weather?: boolean;
};

type Props = {
  location: UserLocation;
  earthquakes?: EarthquakeEvent[];
  naturalEvents?: NaturalEvent[];
  gdacsEvents?: GdacsEvent[];
  weatherData?: WeatherData;
  layers?: MapLayerState;
  height?: string;
};

function MapView({ location }: { location: UserLocation }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 5), { duration: 0.75 });
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [location.latitude, location.longitude, map]);
  return null;
}

function formatTime(value: number | string | null) {
  if (!value) return "Time not provided";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.valueOf()) ? "Time not provided" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function MonitoringMap({
  location,
  earthquakes = [],
  naturalEvents = [],
  gdacsEvents = [],
  weatherData,
  layers = { earthquakes: true, naturalEvents: true, gdacs: false, weather: true },
  height = "100%",
}: Props) {
  const [tileFailed, setTileFailed] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);

  return (
    <div className="monitoring-map" style={{ height }} aria-label="OpenStreetMap disaster monitoring map">
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={5}
        minZoom={2}
        maxZoom={19}
        scrollWheelZoom
        worldCopyJump
        className="leaflet-map"
        attributionControl
      >
        <MapView location={location} />
        <TileLayer
          key={tileRetry}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
          minZoom={2}
          maxZoom={19}
          maxNativeZoom={19}
          eventHandlers={{
            tileerror: () => setTileFailed(true),
            tileload: () => setTileFailed(false),
          }}
        />

        <CircleMarker
          center={[location.latitude, location.longitude]}
          radius={7}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#4379f4", fillOpacity: 1 }}
        >
          <Popup>
            <div className="map-popup">
              <span className="map-popup-label">SELECTED LOCATION</span>
              <strong>{location.name}</strong>
              {layers.weather && weatherData?.current && (
                <>
                  <span>Current Temp: {Math.round(weatherData.current.temperature_2m)}°C</span>
                  <span>Feels like {Math.round(weatherData.current.apparent_temperature)}°C</span>
                  <span>Humidity: {Math.round(weatherData.current.relative_humidity_2m)}% · Wind: {weatherData.current.wind_speed_10m} km/h</span>
                </>
              )}
            </div>
          </Popup>
        </CircleMarker>

        {layers.earthquakes && earthquakes.map((event) => {
          const [longitude, latitude, depth] = event.coordinates;
          const magnitude = event.magnitude ?? 0;
          return (
            <CircleMarker
              key={`quake-${event.id}`}
              center={[latitude, longitude]}
              radius={Math.min(21, Math.max(5, 4 + magnitude * 2.2))}
              pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: magnitude >= 5 ? "#e2604b" : "#ef9f4c", fillOpacity: 0.83 }}
            >
              <Popup>
                <div className="map-popup">
                  <span className="map-popup-label">OBSERVED EVENT · USGS</span>
                  <strong>{event.title}</strong>
                  <span>Magnitude {magnitude.toFixed(1)} · Depth {depth} km</span>
                  <span>{formatTime(event.time)}</span>
                  {event.tsunami && <span className="map-popup-alert">Tsunami flag reported by USGS</span>}
                  {event.alert && <span>USGS alert level: {event.alert}</span>}
                  <a href={event.url} target="_blank" rel="noreferrer">Open USGS event detail ↗</a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {layers.naturalEvents && naturalEvents.map((event) => event.coordinates && (
          <CircleMarker
            key={`eonet-${event.id}`}
            center={[event.coordinates[1], event.coordinates[0]]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: "#33a895", fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="map-popup">
                <span className="map-popup-label">OBSERVED EVENT · NASA EONET</span>
                <strong>{event.title}</strong>
                <span>{event.category}</span>
                <span>{formatTime(event.date)}</span>
                {event.url && <a href={event.url} target="_blank" rel="noreferrer">Open event details ↗</a>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {layers.gdacs && gdacsEvents.map((event) => event.coordinates && (
          <CircleMarker
            key={`gdacs-${event.id}`}
            center={[event.coordinates[1], event.coordinates[0]]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 2, fillColor: event.alertLevel?.toLowerCase() === "red" ? "#d94e52" : "#ddad46", fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="map-popup">
                <span className="map-popup-label">GDACS EVENT</span>
                <strong>{event.title}</strong>
                <span>{event.eventType}{event.alertLevel ? ` · ${event.alertLevel} alert level` : ""}</span>
                <span>{event.country ?? "Country not provided"} · {formatTime(event.date)}</span>
                {event.url && <a href={event.url} target="_blank" rel="noreferrer">Open GDACS details ↗</a>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {tileFailed && (
        <div className="map-tile-notice" role="status">
          <span>Some base-map tiles could not be reached.</span>
          <button type="button" onClick={() => { setTileFailed(false); setTileRetry((value) => value + 1); }}>Retry map tiles</button>
        </div>
      )}
      <div className="map-attribution-note">Map data © OpenStreetMap contributors</div>
    </div>
  );
}
