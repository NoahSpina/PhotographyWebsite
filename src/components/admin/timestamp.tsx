"use client";

import { formatRelativeTimestamp, formatTimestamp } from "@/lib/format";

type TimestampProps = {
  iso: string;
  /** Relative for recent activity; a full date and time everywhere else. */
  relative?: boolean;
  className?: string;
};

export function Timestamp({ iso, relative = false, className }: TimestampProps) {
  const absolute = formatTimestamp(iso);
  return (
    <time
      dateTime={iso}
      title={relative ? absolute : undefined}
      suppressHydrationWarning
      className={className}
    >
      {relative ? formatRelativeTimestamp(iso) : absolute}
    </time>
  );
}
