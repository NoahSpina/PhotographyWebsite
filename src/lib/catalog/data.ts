import "server-only";
import { cacheLife } from "next/cache";
import { proofUrl } from "@/lib/aws/cloudfront";
import type { CollectionTier, FeedFrame } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { createPublicClient } from "@/lib/supabase/public";

const MAX_PORTFOLIO_ALBUMS = 6;
const MAX_FEED_FRAMES = 12;

/**
 * Ready proofs from published portfolio albums, interleaved across the most
 * recent shoots. Falls back to the curated frames in site-config until the
 * studio publishes its first portfolio album.
 */
export async function getHeroFrames(): Promise<FeedFrame[]> {
  "use cache";
  cacheLife("minutes");

  try {
    const frames = await loadPortfolioFrames();
    if (frames.length > 0) return frames;
  } catch (error) {
    console.error("Could not load portfolio photos:", errorMessage(error));
  }

  return siteConfig.hero.frames.map(({ location, ...image }, index) => ({
    id: `curated-${index}`,
    ...image,
    caption: location,
  }));
}

/** Active packages in catalog order, or the fallback tiers in site-config. */
export async function getStudioCollections(): Promise<CollectionTier[]> {
  "use cache";
  cacheLife("hours");

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("packages")
      .select("id, name, description, price_cents, download_limit, includes_prints")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(4);

    if (error) throw new Error(error.message);
    if (data.length > 0) {
      return data.map((row) =>
        toCollectionTier(row.id, {
          name: row.name,
          description: row.description,
          priceCents: row.price_cents,
          downloadLimit: row.download_limit,
          includesPrints: row.includes_prints,
        }),
      );
    }
  } catch (error) {
    console.error("Could not load packages:", errorMessage(error));
  }

  return siteConfig.fallbackCollections.map((seed, index) =>
    toCollectionTier(`fallback-${index}`, seed),
  );
}

async function loadPortfolioFrames(): Promise<FeedFrame[]> {
  const supabase = createPublicClient();

  const { data: albums, error: albumsError } = await supabase
    .from("albums")
    .select("id, title, cover_photo_id")
    .eq("is_public_portfolio", true)
    .eq("status", "published")
    .order("shoot_date", { ascending: false, nullsFirst: false })
    .limit(MAX_PORTFOLIO_ALBUMS);

  if (albumsError) throw new Error(albumsError.message);
  if (albums.length === 0) return [];

  // These rows become Client Component props. Never add master_s3_key.
  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("id, album_id, proof_s3_key, width, height")
    .in(
      "album_id",
      albums.map((album) => album.id),
    )
    .eq("status", "ready")
    .not("proof_s3_key", "is", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_FEED_FRAMES * MAX_PORTFOLIO_ALBUMS);

  if (photosError) throw new Error(photosError.message);

  // One photo per album per round, each album's cover photo first.
  const queues = albums.map((album) => {
    const albumPhotos = photos.filter((photo) => photo.album_id === album.id);
    const coverIndex = albumPhotos.findIndex((photo) => photo.id === album.cover_photo_id);
    if (coverIndex > 0) albumPhotos.unshift(...albumPhotos.splice(coverIndex, 1));
    return albumPhotos.map((photo) => ({ photo, albumTitle: album.title }));
  });

  const frames: FeedFrame[] = [];
  for (let round = 0; frames.length < MAX_FEED_FRAMES; round += 1) {
    const batch = queues.flatMap((queue) => (round < queue.length ? [queue[round]] : []));
    if (batch.length === 0) break;

    for (const { photo, albumTitle } of batch) {
      const frame = toFeedFrame(photo, albumTitle);
      if (frame && frames.length < MAX_FEED_FRAMES) frames.push(frame);
    }
  }
  return frames;
}

function toFeedFrame(
  photo: { id: string; proof_s3_key: string | null; width: number | null; height: number | null },
  albumTitle: string,
): FeedFrame | null {
  if (!photo.proof_s3_key) return null;
  try {
    return {
      id: photo.id,
      src: proofUrl(photo.proof_s3_key),
      alt: `Photograph from ${albumTitle}`,
      width: photo.width ?? 1200,
      height: photo.height ?? 800,
      caption: albumTitle,
    };
  } catch (error) {
    console.error(`Skipping portfolio photo ${photo.id}:`, errorMessage(error));
    return null;
  }
}

type PackageDetails = {
  name: string;
  description: string | null;
  priceCents: number;
  downloadLimit: number | null;
  includesPrints: boolean;
};

function toCollectionTier(id: string, pkg: PackageDetails): CollectionTier {
  const highlights = [
    pkg.downloadLimit === null
      ? "Every finished photograph"
      : `${pkg.downloadLimit} high-resolution ${pkg.downloadLimit === 1 ? "photograph" : "photographs"}`,
  ];
  if (pkg.includesPrints) highlights.push("Fine-art print credit");

  return {
    id,
    name: pkg.name,
    description: pkg.description,
    price: formatPrice(pkg.priceCents),
    highlights,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
