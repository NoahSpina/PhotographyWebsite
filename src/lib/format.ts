const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(cents: number): string {
  return cents % 100 === 0
    ? wholeDollars.format(cents / 100)
    : dollarsAndCents.format(cents / 100);
}

export function formatDollars(dollars: number): string {
  return wholeDollars.format(dollars);
}

const longDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

/** Formats a `YYYY-MM-DD` date without shifting it across time zones. */
export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** 1 -> "01", for editorial numbering. */
export function padIndex(value: number): string {
  return String(value).padStart(2, "0");
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** A stored timestamptz, in the viewer's local zone when called in the browser. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTime.format(date);
}

/** Recent instants as "3 hours ago"; older ones fall back to a full timestamp. */
export function formatRelativeTimestamp(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const elapsedSeconds = Math.round((now - then) / 1000);
  if (elapsedSeconds < 45) return "Just now";
  if (elapsedSeconds < 3600) {
    return relativeTime.format(-Math.max(1, Math.floor(elapsedSeconds / 60)), "minute");
  }
  if (elapsedSeconds < 86400) {
    return relativeTime.format(-Math.max(1, Math.floor(elapsedSeconds / 3600)), "hour");
  }
  if (elapsedSeconds < 7 * 86400) {
    return relativeTime.format(-Math.max(1, Math.floor(elapsedSeconds / 86400)), "day");
  }
  return formatTimestamp(iso);
}
