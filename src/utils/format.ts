export function formatNumber(value: number | null | undefined, decimals = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

export function formatWithUnit(value: number | null | undefined, unit: string, decimals = 0) {
  const formatted = formatNumber(value, decimals);
  return formatted === "—" ? formatted : `${formatted} ${unit}`;
}
