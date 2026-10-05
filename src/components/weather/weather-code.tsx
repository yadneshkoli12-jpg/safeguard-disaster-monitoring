import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function weatherDescription(code: number) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return code >= 65 ? "Heavy rain" : "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return code === 82 ? "Heavy rain showers" : "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Weather conditions";
}

export function weatherAtmosphere(code: number, isDay: boolean): string {
  if (!isDay) {
    // Return "night" + condition for correct animations (moon shown, no sun)
    if (code >= 95) return "night storm";
    if (code >= 71 && code <= 86) return "night snow";
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return "night rain";
    if (code === 45 || code === 48) return "night fog";
    if (code >= 2) return "night cloud";
    return "night";
  }
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 86) return "snow";
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code >= 2) return "cloud";
  return "clear";
}

export function WeatherSymbol({ code, isDay = true, size = 60, className }: { code: number; isDay?: boolean; size?: number; className?: string }) {
  let Icon: LucideIcon = Sun;
  if (!isDay) Icon = Moon;
  else if (code >= 95) Icon = CloudLightning;
  else if (code >= 71 && code <= 86) Icon = CloudSnow;
  else if (code >= 61 && code <= 82) Icon = CloudRain;
  else if (code >= 51 && code <= 57) Icon = CloudDrizzle;
  else if (code === 45 || code === 48) Icon = CloudFog;
  else if (code >= 2) Icon = Cloud;
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}
