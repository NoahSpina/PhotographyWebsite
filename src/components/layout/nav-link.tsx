/** Desktop nav text link. Pair with `NavMark` for the underline that draws in on hover. */
export const navLinkClass = "eyebrow group relative cursor-pointer whitespace-nowrap py-2";

export function NavMark({ active = false }: { active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`nav-mark absolute inset-x-0 bottom-0 h-px origin-left bg-clay transition-transform duration-700 ease-luxe ${
        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
      }`}
    />
  );
}
