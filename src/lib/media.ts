/** A photograph plus its intrinsic size, so layouts can reserve space before it loads. */
export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Curated Unsplash photograph. `width` and `height` are the original's
 * dimensions; Unsplash serves a 2400px rendition that next/image then
 * resizes for each device.
 */
export function unsplash(id: string, width: number, height: number, alt: string): SiteImage {
  return {
    src: `https://images.unsplash.com/photo-${id}?w=2400&q=80&fm=jpg&fit=max`,
    alt,
    width,
    height,
  };
}

export function isPortrait(image: Pick<SiteImage, "width" | "height">): boolean {
  return image.height > image.width;
}
