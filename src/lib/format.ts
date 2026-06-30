/** Compact, locale-aware number formatting for dense data tables and stats. */
export function fmt(value: number | null | undefined, digits = 3): string {
  if (value == null || isNaN(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e7)) {
    return value.toExponential(2);
  }
  // Trim trailing zeros while respecting the requested precision.
  const fixed = value.toFixed(digits);
  return parseFloat(fixed).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export function fmtInt(value: number): string {
  return Math.round(value).toLocaleString();
}

export function fmtPct(value: number, digits = 1): string {
  if (isNaN(value)) return "—";
  return `${value >= 0 ? "" : ""}${value.toFixed(digits)}%`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
