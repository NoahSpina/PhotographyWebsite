import "server-only";
import type { UpgradeOptions } from "@/lib/gallery/types";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { Album, Order, Package } from "@/types";

type EntitlementAlbum = Pick<Album, "id" | "assigned_package_id">;

type PaidOrder = Pick<Order, "order_type" | "package_id" | "download_limit_granted">;

export type EntitlementPackage = Pick<
  Package,
  "id" | "name" | "download_limit" | "extra_photo_price_cents"
>;

export type AlbumEntitlement = {
  /** How many photos the client may select and download. null means unlimited. */
  downloadLimit: number | null;
  selectionCount: number;
  /** null when unlimited. Zero once the limit is reached or exceeded. */
  remaining: number | null;
  /** True when the client may download at least one high-res master. */
  downloadsUnlocked: boolean;
  /** The package that sets the base tier. Add-on photos are priced from it. */
  basePackage: EntitlementPackage | null;
};

const ENTITLEMENT_PACKAGE_COLUMNS = "id, name, download_limit, extra_photo_price_cents";

/**
 * Resolves a client's entitlement for one album.
 *
 * - The base tier is the most generous of the admin-assigned package
 *   override and every paid `booking` or `gallery_upgrade` order. An
 *   override can raise a client's tier but never take away one they paid for.
 * - Paid `extra_photos` orders add to that base.
 * - A null limit anywhere means unlimited.
 * - Pending and refunded orders grant nothing.
 */
export function resolveEntitlement(input: {
  overridePackage: EntitlementPackage | null;
  paidOrders: readonly PaidOrder[];
  packagesById: ReadonlyMap<string, EntitlementPackage>;
  selectionCount: number;
}): AlbumEntitlement {
  const tiers: { limit: number | null; pkg: EntitlementPackage | null }[] = [];
  if (input.overridePackage) {
    tiers.push({ limit: input.overridePackage.download_limit, pkg: input.overridePackage });
  }

  let extras: number | null = 0;
  for (const order of input.paidOrders) {
    if (order.order_type === "extra_photos") {
      extras =
        extras === null || order.download_limit_granted === null
          ? null
          : extras + order.download_limit_granted;
    } else {
      tiers.push({
        limit: order.download_limit_granted,
        pkg: input.packagesById.get(order.package_id) ?? null,
      });
    }
  }

  // Earlier entries win ties, so the override names the package when it
  // matches a paid tier.
  let base: (typeof tiers)[number] | null = null;
  for (const tier of tiers) {
    if (!base || tierRank(tier.limit) > tierRank(base.limit)) base = tier;
  }

  const baseLimit = base ? base.limit : 0;
  const downloadLimit = baseLimit === null || extras === null ? null : baseLimit + extras;

  return {
    downloadLimit,
    selectionCount: input.selectionCount,
    remaining:
      downloadLimit === null ? null : Math.max(0, downloadLimit - input.selectionCount),
    downloadsUnlocked: downloadLimit === null || downloadLimit > 0,
    basePackage: base?.pkg ?? null,
  };
}

function tierRank(limit: number | null): number {
  return limit === null ? Number.POSITIVE_INFINITY : limit;
}

/**
 * Loads and resolves the entitlement of `clientId` on `album`. Pass the
 * RLS-bound client of a caller who has already been checked as the album's
 * client or an admin. Throws when the data cannot be read.
 */
export async function getAlbumEntitlement(
  supabase: ServerSupabaseClient,
  album: EntitlementAlbum,
  clientId: string,
): Promise<AlbumEntitlement> {
  const [ordersResult, selectionCount] = await Promise.all([
    supabase
      .from("orders")
      .select("order_type, package_id, download_limit_granted")
      .eq("album_id", album.id)
      .eq("client_id", clientId)
      .eq("status", "paid"),
    countSelections(supabase, album.id, clientId),
  ]);

  if (ordersResult.error) {
    console.error("Entitlement could not read orders:", ordersResult.error.message);
    throw new Error("The download limit could not be calculated.");
  }

  const paidOrders = ordersResult.data;
  const packageIds = new Set<string>();
  if (album.assigned_package_id) packageIds.add(album.assigned_package_id);
  for (const order of paidOrders) {
    if (order.order_type !== "extra_photos") packageIds.add(order.package_id);
  }

  const packagesById = await loadPackages(supabase, [...packageIds]);
  const overridePackage = album.assigned_package_id
    ? (packagesById.get(album.assigned_package_id) ?? null)
    : null;

  if (album.assigned_package_id && !overridePackage) {
    // Fails closed: the override is ignored rather than guessed at.
    console.error(
      `Album ${album.id} has package override ${album.assigned_package_id}, but it is not readable. Check that supabase/migrations/0002_client_proofing.sql has been run.`,
    );
  }

  return resolveEntitlement({ overridePackage, paidOrders, packagesById, selectionCount });
}

export async function countSelections(
  supabase: ServerSupabaseClient,
  albumId: string,
  clientId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("selections")
    .select("id", { count: "exact", head: true })
    .eq("album_id", albumId)
    .eq("client_id", clientId);

  if (error || count === null) {
    console.error("Could not count selections:", error?.message ?? "no count returned");
    throw new Error("Selections could not be counted.");
  }
  return count;
}

async function loadPackages(
  supabase: ServerSupabaseClient,
  ids: string[],
): Promise<Map<string, EntitlementPackage>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("packages")
    .select(ENTITLEMENT_PACKAGE_COLUMNS)
    .in("id", ids);

  if (error) {
    console.error("Entitlement could not read packages:", error.message);
    throw new Error("The download limit could not be calculated.");
  }
  return new Map(data.map((pkg) => [pkg.id, pkg]));
}

/**
 * Active packages that would raise the client's limit, plus the per-photo
 * add-on price of their current package. Empty for unlimited galleries.
 */
export async function getUpgradeOptions(
  supabase: ServerSupabaseClient,
  entitlement: AlbumEntitlement | null,
): Promise<UpgradeOptions> {
  if (!entitlement || entitlement.downloadLimit === null) {
    return { packages: [], extraPhotoPriceCents: null };
  }

  const currentLimit = entitlement.downloadLimit;
  const addOnPrice = entitlement.basePackage?.extra_photo_price_cents ?? 0;
  const extraPhotoPriceCents = addOnPrice > 0 ? addOnPrice : null;

  const { data, error } = await supabase
    .from("packages")
    .select("id, name, description, price_cents, download_limit, includes_prints")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Could not load upgrade packages:", error.message);
    return { packages: [], extraPhotoPriceCents };
  }

  return {
    packages: data
      .filter((pkg) => pkg.download_limit === null || pkg.download_limit > currentLimit)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        priceCents: pkg.price_cents,
        downloadLimit: pkg.download_limit,
        includesPrints: pkg.includes_prints,
      })),
    extraPhotoPriceCents,
  };
}
