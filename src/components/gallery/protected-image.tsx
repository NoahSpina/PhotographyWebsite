"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";

type ProtectedImageProps = {
  src: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  /** Load immediately with high fetch priority, for the image in view. */
  eager?: boolean;
  className?: string;
};

function preventDefault(event: SyntheticEvent) {
  event.preventDefault();
}

/**
 * Speed bumps against casual saving of watermarked proofs: no context menu,
 * no drag, no selection or iOS long-press callout, hidden when printed, and
 * a transparent layer above the image so pointer events never reach the
 * `<img>`. The real protection is the watermark baked in by Lambda.
 */
export function ProtectedImage({
  src,
  alt,
  sizes,
  fit = "cover",
  eager = false,
  className = "",
}: ProtectedImageProps) {
  return (
    <div
      onContextMenu={preventDefault}
      onDragStart={preventDefault}
      className={`relative select-none overflow-hidden [-webkit-touch-callout:none] print:invisible ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={`pointer-events-none select-none [-webkit-touch-callout:none] [-webkit-user-drag:none] ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
      />
      <div aria-hidden="true" className="absolute inset-0" />
    </div>
  );
}
