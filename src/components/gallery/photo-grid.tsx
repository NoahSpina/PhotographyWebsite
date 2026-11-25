import { HeartIcon } from "@/components/gallery/heart-icon";
import { ProtectedImage } from "@/components/gallery/protected-image";
import type { GalleryPhoto } from "@/lib/gallery/types";

type PhotoGridProps = {
  photos: GalleryPhoto[];
  selections: ReadonlyMap<string, string | null>;
  pendingIds: ReadonlySet<string>;
  canSelect: boolean;
  onOpen: (photoId: string) => void;
  onToggle: (photoId: string) => void;
};

const FALLBACK_RATIO = 3 / 2;

function aspectRatio(photo: GalleryPhoto): number {
  if (!photo.width || !photo.height) return FALLBACK_RATIO;
  return Math.min(3, Math.max(0.4, photo.width / photo.height));
}

/**
 * Justified rows: each tile's flex-basis and flex-grow are proportional to
 * its aspect ratio, so every tile in a row ends up the same height. The
 * trailing pseudo-element absorbs the last row's spare space.
 */
export function PhotoGrid({
  photos,
  selections,
  pendingIds,
  canSelect,
  onOpen,
  onToggle,
}: PhotoGridProps) {
  return (
    <ul className="flex flex-wrap gap-2 [--row-height:8.5rem] after:grow-[999] after:content-[''] sm:[--row-height:11rem] lg:[--row-height:14rem]">
      {photos.map((photo, index) => {
        const ratio = aspectRatio(photo);
        const selected = selections.has(photo.id);
        const hasNote = Boolean(selections.get(photo.id));
        const label = `photo ${index + 1}`;

        return (
          <li
            key={photo.id}
            className="relative"
            style={{ flexGrow: ratio, flexBasis: `calc(var(--row-height) * ${ratio})` }}
          >
            <button
              type="button"
              onClick={() => onOpen(photo.id)}
              aria-label={`View ${label}`}
              style={{ aspectRatio: ratio }}
              className={`block w-full overflow-hidden rounded-sm bg-neutral-100 dark:bg-neutral-900 ${
                selected ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-background" : ""
              }`}
            >
              <ProtectedImage
                src={photo.thumbUrl}
                alt=""
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="h-full w-full"
              />
            </button>

            <button
              type="button"
              onClick={() => onToggle(photo.id)}
              disabled={!canSelect || pendingIds.has(photo.id)}
              aria-pressed={selected}
              aria-label={selected ? `Remove ${label} from your selection` : `Select ${label}`}
              className={`absolute right-2 top-2 flex size-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors disabled:opacity-70 ${
                selected
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-white/85 text-neutral-900 hover:bg-white"
              }`}
            >
              <HeartIcon filled={selected} className="size-5" />
            </button>

            {hasNote ? (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-xs text-white">
                Note
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
