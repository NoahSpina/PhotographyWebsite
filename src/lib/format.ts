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
