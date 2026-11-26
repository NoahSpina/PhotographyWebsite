import { formatBytes } from "@/lib/uploads";

const S3_STANDARD_GB_MONTH_USD = 0.023;

export function coerceFileSizeBytes(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function formatStorageFootprint(
  totalBytes: number | null,
  partial: boolean,
): string {
  if (totalBytes === null) return "—";
  const label = formatBytes(totalBytes);
  const estimate = estimateMonthlyStorageCost(totalBytes);
  const partialLabel = partial ? " (partial)" : "";
  return `${label}${partialLabel} · ~${estimate}/mo est.`;
}

export function estimateMonthlyStorageCost(bytes: number): string {
  if (bytes <= 0) return "$0.00";
  const gbMonths = bytes / (1024 * 1024 * 1024);
  const dollars = Math.max(0.01, Math.ceil(gbMonths * S3_STANDARD_GB_MONTH_USD * 100) / 100);
  return `$${dollars.toFixed(2)}`;
}

export function formatAlbumStorage(bytes: number | null, partial: boolean): string {
  if (bytes === null) return "—";
  const label = formatBytes(bytes);
  return partial ? `${label}+` : label;
}