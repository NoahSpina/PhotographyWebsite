export function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.25s-7.5-4.56-9.3-9.1C1.42 7.93 3.43 4.5 6.98 4.5c2.02 0 3.42 1.06 5.02 3 1.6-1.94 3-3 5.02-3 3.55 0 5.56 3.43 4.28 6.65-1.8 4.54-9.3 9.1-9.3 9.1Z" />
    </svg>
  );
}
