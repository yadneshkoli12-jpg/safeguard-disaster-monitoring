export type UserLocation = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type SearchLocation = UserLocation & { id?: number; countryCode?: string };

export type ResourceStatus = "loading" | "success" | "empty" | "error" | "stale";

export type ResourceState<T> = {
  status: ResourceStatus;
  data?: T;
  error?: string;
  updatedAt?: string;
};

export type WeatherData = {
  source: string;
  classification: "FORECAST";
  fetchedAt: string;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    visibility: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    weather_code: number[];
    relative_humidity_2m: number[];
    pressure_msl: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    visibility: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  units: {
    temperature: string;
    wind: string;
    precipitation: string;
    visibility: string;
  };
};

export type AirQualityData = {
  source: string;
  classification: "FORECAST";
  fetchedAt: string;
  current: {
    time: string;
    us_aqi: number | null;
    european_aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
    nitrogen_dioxide: number | null;
    sulphur_dioxide: number | null;
    ozone: number | null;
    uv_index: number | null;
  };
};

export type EarthquakeEvent = {
  id: string;
  magnitude: number | null;
  place: string;
  time: number;
  updated: number;
  coordinates: [number, number, number];
  alert: string | null;
  tsunami: boolean;
  significance: number | null;
  url: string;
  title: string;
};

export type NaturalEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  date: string | null;
  coordinates: [number, number] | null;
  url: string | null;
  sources: string[];
};

export type GdacsEvent = {
  id: string;
  title: string;
  eventType: string;
  alertLevel: string | null;
  date: string | null;
  coordinates: [number, number] | null;
  country: string | null;
  url: string | null;
};

export type HistoricalWeatherDay = {
  date: string;
  temperature: number | null;
  rainfall: number | null;
  wind: number | null;
  humidity: number | null;
};

export type ApplicationAdvisory = {
  id: string;
  title: string;
  description: string;
  severity: "moderate" | "high";
  source: "Open-Meteo + Safeguard threshold";
  classification: "APPLICATION ADVISORY";
};
