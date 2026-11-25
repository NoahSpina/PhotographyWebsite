import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

type WordmarkProps = {
  href?: string;
  className?: string;
  onClick?: () => void;
};

/** Serif studio wordmark, with the last word set in italic. */
export function Wordmark({ href = "/", className = "", onClick }: WordmarkProps) {
  const words = siteConfig.shortName.split(" ");
  const accent = words.length > 1 ? words.pop() : null;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`cursor-pointer whitespace-nowrap font-serif text-[1.625rem] leading-none tracking-[0.01em] ${className}`}
    >
      {words.join(" ")}
      {accent ? <span className="font-light italic"> {accent}</span> : null}
    </Link>
  );
}
