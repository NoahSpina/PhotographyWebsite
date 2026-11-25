type ButtonVariant = "primary" | "outline" | "light" | "outline-light";
type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-3 whitespace-nowrap font-sans text-[0.6875rem] font-medium uppercase tracking-[0.2em] transition-colors duration-500 ease-luxe disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-espresso text-alabaster hover:bg-clay",
  outline:
    "border border-ink/20 text-ink hover:border-espresso hover:bg-espresso hover:text-alabaster",
  light: "bg-alabaster text-ink hover:bg-clay hover:text-alabaster",
  "outline-light":
    "border border-alabaster/30 text-alabaster hover:border-alabaster hover:bg-alabaster hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-5",
  md: "h-12 px-7",
  lg: "h-14 px-9",
};

/** Class names for buttons and for links styled as buttons. */
export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}
