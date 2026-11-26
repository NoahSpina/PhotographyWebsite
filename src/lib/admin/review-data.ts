import "server-only";

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { proofUrl } from "@/lib/aws/cloudfront";
import { verifyAdmin } from "@/lib/auth/admin";
import { resolveEntitlement, type EntitlementPackage } from "@/lib/entitlements";
import { isStuckPhoto } from "@/lib/admin/cleanup-stuck";
import { coerceFileSizeBytes } from "@/lib/admin/storage";
import { formatLongDate } from "@/lib/format";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { AlbumStatus, Order, PhotoStatus, RetouchStatus } from "@/types";
import {
  formatClientLabel,
  noteText,
  type ActivityItem,
  type AlbumOverview,
  type DashboardModel,
  type DownloadQuota,
  type ReviewPhoto,
  type SelectionReview,
} from "@/lib/admin/review";

const RECENT_LIMIT = 10;

const PACKAGE_COLUMNS = "id, name, download_limit, extra_photo_price_cents";

type ProfileName = { full_name: string | null; email: string | null };

type SelectionRow = {
  id: string;
  album_id: string;
  photo_id: string;
  client_id: string;
  notes: string | null;
  retouch_status: RetouchStatus;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
};

type AlbumOrder = {
  album_id: string;
  client_id: string;
  order_type: Order["order_type"];
  package_id: string;
  download_limit_granted: number | null;
};

type AlbumSummary = {
  id: string;
  title: string;
  status: AlbumStatus;
  shoot_date: string | null;
  client_email: string | null;
  client_id: string | null;
  assigned_package_id: string | null;
  created_at: string;
};

/**
 * Server-side admin gate. Queries that follow this call run only after
 * `profiles.role === 'admin'` has been confirmed for the signed-in user.
 */
export async function requireAdminClient(nextPath: string): Promise<ServerSupabaseClient> {
  await connection();
  const admin = await verifyAdmin();
  if (!admin.ok) {
    const next = encodeURIComponent(nextPath);
    redirect(
      admin.reason === "unauthenticated"
        ? `/login?next=${next}`
        : `/login?error=forbidden&next=${next}`,
    );
  }
  return admin.supabase;
}

export async function loadSelectionRollups(
  supabase: ServerSupabaseClient,
): Promise<Map<string, { selectionCount: number; notesCount: number }> | null> {
  const { data, error } = await supabase.from("selections").select("album_id, notes");
  if (error) {
    console.error("Could not load selection counts:", error.message);
    return null;
  }
  return rollupSelections(data);
}

export async function loadDashboard(): Promise<DashboardModel> {
  const supabase = await requireAdminClient("/admin");
  const warnings: string[] = [];

  const [albumsResult, photosResult, selectionsResult, packagesResult, ordersResult] =
    await Promise.all([
      supabase
        .from("albums")
        .select(
          "id, title, status, shoot_date, client_email, client_id, assigned_package_id, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("photos")
        .select("id, album_id, status, file_size_bytes, updated_at, superseded_s3_keys"),
      supabase
        .from("selections")
        .select(
          "id, album_id, photo_id, client_id, notes, retouch_status, admin_reply, admin_replied_at, created_at",
        ),
      supabase.from("packages").select(PACKAGE_COLUMNS),
      supabase
        .from("orders")
        .select("album_id, client_id, order_type, package_id, download_limit_granted")
        .eq("status", "paid"),
    ]);

  if (albumsResult.error) {
    console.error("Could not load albums:", albumsResult.error.message);
    warnings.push("Albums could not be loaded.");
  }
  if (photosResult.error) {
    console.error("Could not load photos:", photosResult.error.message);
    warnings.push("Photo counts could not be loaded.");
  }
  if (selectionsResult.error) {
    console.error("Could not load selections:", selectionsResult.error.message);
    warnings.push("Selections could not be loaded.");
  }
  if (packagesResult.error) {
    console.error("Could not load packages:", packagesResult.error.message);
    warnings.push("Package quotas could not be loaded.");
  }
  if (ordersResult.error) {
    console.error("Could not load orders:", ordersResult.error.message);
    warnings.push("Paid order quotas could not be loaded.");
  }

  const albums = albumsResult.data;
  const photos = photosResult.data;
  const selections = selectionsResult.data;
  const packagesById = new Map<string, EntitlementPackage>(
    (packagesResult.data ?? []).map((pkg) => [pkg.id, pkg]),
  );
  const orders = (ordersResult.data ?? []).filter(
    (order): order is AlbumOrder => order.album_id !== null,
  );

  const albumCounts = albums
    ? {
        total: albums.length,
        published: albums.filter((album) => album.status === "published").length,
        draft: albums.filter((album) => album.status === "draft").length,
        archived: albums.filter((album) => album.status === "archived").length,
      }
    : null;

  const photoCounts = photos ? countPhotoStatuses(photos) : null;
  const storageRollup = photos ? rollupStorage(photos) : null;
  const stuckPhotoIds = photos
    ? photos.filter((row) => isStuckPhoto(row)).map((row) => row.id)
    : [];
  const rollups = selections ? rollupSelections(selections) : null;
  const selectionCount = rollups
    ? [...rollups.values()].reduce((sum, row) => sum + row.selectionCount, 0)
    : null;
  const notesCount = rollups
    ? [...rollups.values()].reduce((sum, row) => sum + row.notesCount, 0)
    : null;

  const recentAlbums = albums?.slice(0, RECENT_LIMIT) ?? [];
  const recentSelections = selections ? prioritizeRecent(selections) : [];

  const profileIds = [
    ...recentAlbums.flatMap((album) => (album.client_id ? [album.client_id] : [])),
    ...recentSelections.map((row) => row.client_id),
  ];
  const photoIds = [...new Set(recentSelections.map((row) => row.photo_id))];

  const [profiles, thumbs] = await Promise.all([
    loadProfiles(supabase, profileIds),
    loadThumbUrls(supabase, photoIds),
  ]);

  const albumsById = new Map((albums ?? []).map((album) => [album.id, album]));
  const photosByAlbum = photos ? countByAlbum(photos) : null;

  return {
    albumCounts,
    photoCounts,
    selectionCount,
    notesCount,
    activity: selections
      ? recentSelections.map((row) =>
          toActivityItem(row, albumsById.get(row.album_id), profiles, thumbs),
        )
      : null,
    albums: albums
      ? recentAlbums.map((album) =>
          toOverview(
            album,
            profiles,
            photosByAlbum,
            rollups,
            packagesById,
            orders,
            {
              packages: packagesResult.error === null,
              orders: ordersResult.error === null,
            },
            storageRollup?.byAlbum.get(album.id),
          ),
        )
      : null,
    albumTotal: albums?.length ?? null,
    storageBytes: storageRollup?.totalBytes ?? null,
    storagePartial: storageRollup?.partial ?? false,
    stuckPhotoIds,
    warning: warnings.length > 0 ? warnings.join(" ") : null,
  };
}

export async function loadSelectionReview(albumId: string): Promise<SelectionReview | null> {
  const supabase = await requireAdminClient(`/admin/albums/${albumId}/selections`);
  if (!isUuid(albumId)) return null;

  const [albumResult, photosResult, selectionsResult, packagesResult, ordersResult] =
    await Promise.all([
      supabase
        .from("albums")
        .select(
          "id, title, slug, shoot_date, client_email, client_id, status, assigned_package_id",
        )
        .eq("id", albumId)
        .maybeSingle(),
      supabase
        .from("photos")
        .select("id, status, thumb_s3_key, proof_s3_key, master_s3_key, sort_order, created_at")
        .eq("album_id", albumId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("selections")
        .select(
          "id, album_id, photo_id, client_id, notes, retouch_status, admin_reply, admin_replied_at, created_at",
        )
        .eq("album_id", albumId),
      supabase.from("packages").select(PACKAGE_COLUMNS),
      supabase
        .from("orders")
        .select("album_id, client_id, order_type, package_id, download_limit_granted")
        .eq("album_id", albumId)
        .eq("status", "paid"),
    ]);

  if (albumResult.error) {
    console.error("Could not load album:", albumResult.error.message);
    throw new Error("The album could not be loaded.");
  }
  const album = albumResult.data;
  if (!album) return null;

  if (photosResult.error) {
    console.error("Could not load photos:", photosResult.error.message);
    throw new Error("The album photos could not be loaded.");
  }
  if (selectionsResult.error) {
    console.error("Could not load selections:", selectionsResult.error.message);
    throw new Error("Selections could not be loaded.");
  }
  if (packagesResult.error) {
    console.error("Could not load packages:", packagesResult.error.message);
  }
  if (ordersResult.error) {
    console.error("Could not load orders:", ordersResult.error.message);
  }

  const packagesById = new Map<string, EntitlementPackage>(
    (packagesResult.data ?? []).map((pkg) => [pkg.id, pkg]),
  );
  const orders = (ordersResult.data ?? []).filter(
    (order): order is AlbumOrder => order.album_id !== null,
  );
  const profiles = await loadProfiles(supabase, [
    ...(album.client_id ? [album.client_id] : []),
    ...selectionsResult.data.map((row) => row.client_id),
  ]);

  const byPhoto = new Map<string, SelectionRow[]>();
  for (const row of selectionsResult.data) {
    const current = byPhoto.get(row.photo_id) ?? [];
    current.push(row);
    byPhoto.set(row.photo_id, current);
  }

  const photos: ReviewPhoto[] = photosResult.data.map((photo) => {
    const picked = describeSelections(byPhoto.get(photo.id) ?? [], profiles);
    return {
      id: photo.id,
      filename: baseFilename(photo.master_s3_key, photo.id),
      thumbUrl: proofImageUrl(photo.thumb_s3_key),
      proofUrl: proofImageUrl(photo.proof_s3_key),
      status: photo.status,
      selected: picked.selected,
      notes: picked.notes,
      selectedAt: picked.selectedAt,
      clientLabel: picked.clientLabel,
      selectionId: picked.selectionId,
      retouchStatus: picked.retouchStatus,
      adminReply: picked.adminReply,
      adminRepliedAt: picked.adminRepliedAt,
    };
  });

  const selectionCount = photos.filter((photo) => photo.selected).length;
  const notedPhotoCount = photos.filter((photo) => photo.notes).length;

  return {
    album: {
      id: album.id,
      title: album.title,
      slug: album.slug,
      shootDateLabel: album.shoot_date ? formatLongDate(album.shoot_date) : null,
      clientLabel: formatClientLabel(
        album.client_id ? profiles.get(album.client_id) : null,
        album.client_email,
      ),
      status: album.status,
      photoCount: photos.length,
      selectionCount,
      notedPhotoCount,
      quota: quotaForAlbum(album, packagesById, orders, {
        packages: packagesResult.error === null,
        orders: ordersResult.error === null,
      }),
    },
    photos,
  };
}

function toOverview(
  album: AlbumSummary,
  profiles: Map<string, ProfileName>,
  photosByAlbum: Map<string, number> | null,
  rollups: Map<string, { selectionCount: number; notesCount: number }> | null,
  packagesById: Map<string, EntitlementPackage>,
  orders: AlbumOrder[],
  sources: QuotaSources,
  storage?: { bytes: number; partial: boolean },
): AlbumOverview {
  const rollup = rollups?.get(album.id);
  return {
    id: album.id,
    title: album.title,
    clientLabel: formatClientLabel(
      album.client_id ? profiles.get(album.client_id) : null,
      album.client_email,
    ),
    status: album.status,
    photoCount: photosByAlbum ? (photosByAlbum.get(album.id) ?? 0) : null,
    storageBytes: storage ? storage.bytes : null,
    storagePartial: storage?.partial ?? false,
    selectionCount: rollups ? (rollup?.selectionCount ?? 0) : null,
    notesCount: rollups ? (rollup?.notesCount ?? 0) : null,
    quota: quotaForAlbum(album, packagesById, orders, sources),
  };
}

function rollupStorage(
  photos: {
    album_id: string;
    file_size_bytes: number | string | null;
  }[],
): { totalBytes: number | null; partial: boolean; byAlbum: Map<string, { bytes: number; partial: boolean }> } {
  let total = 0;
  let partial = false;
  const byAlbum = new Map<string, { bytes: number; partial: boolean }>();

  for (const photo of photos) {
    const size = coerceFileSizeBytes(photo.file_size_bytes);
    const current = byAlbum.get(photo.album_id) ?? { bytes: 0, partial: false };
    if (size === null) {
      partial = true;
      byAlbum.set(photo.album_id, { ...current, partial: true });
      continue;
    }
    total += size;
    byAlbum.set(photo.album_id, { bytes: current.bytes + size, partial: current.partial });
  }

  return {
    totalBytes: photos.length === 0 ? 0 : total,
    partial,
    byAlbum,
  };
}

function toActivityItem(
  row: SelectionRow,
  album: AlbumSummary | undefined,
  profiles: Map<string, ProfileName>,
  thumbs: Map<string, string | null>,
): ActivityItem {
  return {
    id: row.id,
    albumId: row.album_id,
    albumTitle: album?.title ?? "Album",
    clientLabel: formatClientLabel(
      profiles.get(row.client_id),
      album?.client_email,
      "Client",
    ),
    note: noteText(row.notes),
    thumbUrl: thumbs.get(row.photo_id) ?? null,
    createdAt: row.created_at,
  };
}

type QuotaSources = { packages: boolean; orders: boolean };

function quotaForAlbum(
  album: {
    id: string;
    client_id: string | null;
    assigned_package_id: string | null;
  },
  packagesById: Map<string, EntitlementPackage>,
  orders: readonly AlbumOrder[],
  sources: QuotaSources,
): DownloadQuota {
  if (!sources.packages && !sources.orders) return { known: false };

  const override =
    sources.packages && album.assigned_package_id
      ? (packagesById.get(album.assigned_package_id) ?? null)
      : null;
  if (sources.packages && album.assigned_package_id && !override) {
    console.error(
      `Album ${album.id} has package override ${album.assigned_package_id}, but it is not readable.`,
    );
  }

  const paidOrders =
    sources.orders && album.client_id
      ? orders.filter(
          (order) => order.album_id === album.id && order.client_id === album.client_id,
        )
      : [];

  if (!override && paidOrders.length === 0) return { known: false };

  const entitlement = resolveEntitlement({
    overridePackage: override,
    paidOrders,
    packagesById,
    selectionCount: 0,
  });
  return { known: true, limit: entitlement.downloadLimit };
}

function describeSelections(
  rows: SelectionRow[],
  profiles: Map<string, ProfileName>,
): {
  selected: boolean;
  notes: string | null;
  selectedAt: string | null;
  clientLabel: string | null;
  selectionId: string | null;
  retouchStatus: RetouchStatus | null;
  adminReply: string | null;
  adminRepliedAt: string | null;
} {
  if (rows.length === 0) {
    return {
      selected: false,
      notes: null,
      selectedAt: null,
      clientLabel: null,
      selectionId: null,
      retouchStatus: null,
      adminReply: null,
      adminRepliedAt: null,
    };
  }

  const noted = rows.flatMap((row) => {
    const note = noteText(row.notes);
    return note ? [{ note, clientId: row.client_id }] : [];
  });
  const notes =
    noted.length === 0
      ? null
      : noted.length === 1
        ? noted[0].note
        : noted
            .map(
              (row) =>
                `${formatClientLabel(profiles.get(row.clientId), null, "Client")}: ${row.note}`,
            )
            .join("\n\n");

  const latest = rows.reduce((current, row) =>
    Date.parse(row.created_at) > Date.parse(current.created_at) ? row : current,
  );
  const clientLabel = [...new Set(rows.map((row) => row.client_id))]
    .map((clientId) => formatClientLabel(profiles.get(clientId), null, "Client"))
    .join(", ");

  const primary =
    rows.find((row) => noteText(row.notes)) ??
    rows.reduce((current, row) =>
      Date.parse(row.created_at) > Date.parse(current.created_at) ? row : current,
    );

  return {
    selected: true,
    notes,
    selectedAt: latest.created_at,
    clientLabel,
    selectionId: primary.id,
    retouchStatus: primary.retouch_status,
    adminReply: noteText(primary.admin_reply),
    adminRepliedAt: primary.admin_replied_at,
  };
}

/**
 * Last path segment of a master key (`photoId.jpg`), or the photo id.
 * Never returns a URL, a `masters/` prefix, or any other path.
 */
function baseFilename(masterKey: string | null, photoId: string): string {
  const segment = masterKey?.split("/").pop() ?? "";
  if (
    segment !== "." &&
    segment !== ".." &&
    !segment.startsWith("masters") &&
    !segment.includes("://") &&
    /^[A-Za-z0-9._-]{1,180}$/.test(segment)
  ) {
    return segment;
  }
  return photoId;
}

function proofImageUrl(key: string | null): string | null {
  if (!key) return null;
  try {
    return proofUrl(key);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "A proof URL was rejected.");
    return null;
  }
}

function rollupSelections(
  rows: { album_id: string; notes: string | null }[],
): Map<string, { selectionCount: number; notesCount: number }> {
  const map = new Map<string, { selectionCount: number; notesCount: number }>();
  for (const row of rows) {
    const current = map.get(row.album_id) ?? { selectionCount: 0, notesCount: 0 };
    map.set(row.album_id, {
      selectionCount: current.selectionCount + 1,
      notesCount: current.notesCount + (noteText(row.notes) ? 1 : 0),
    });
  }
  return map;
}

/**
 * Latest selections, with retouching notes floated to the top of that window
 * so a note is not buried under favorites that arrived in the same stretch.
 */
function prioritizeRecent(rows: SelectionRow[]): SelectionRow[] {
  const latest = [...rows].sort(byNewest).slice(0, RECENT_LIMIT);
  return latest.sort((a, b) => {
    const noteDelta = Number(Boolean(noteText(b.notes))) - Number(Boolean(noteText(a.notes)));
    if (noteDelta !== 0) return noteDelta;
    return byNewest(a, b);
  });
}

function byNewest(a: { created_at: string }, b: { created_at: string }): number {
  const aTime = Date.parse(a.created_at);
  const bTime = Date.parse(b.created_at);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
}

function countPhotoStatuses(photos: { status: PhotoStatus }[]): {
  total: number;
  uploading: number;
  processing: number;
  failed: number;
} {
  const counts = { total: photos.length, uploading: 0, processing: 0, failed: 0 };
  for (const photo of photos) {
    if (photo.status === "uploading" || photo.status === "processing" || photo.status === "failed") {
      counts[photo.status] += 1;
    }
  }
  return counts;
}

function countByAlbum(photos: { album_id: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const photo of photos) {
    map.set(photo.album_id, (map.get(photo.album_id) ?? 0) + 1);
  }
  return map;
}

async function loadProfiles(
  supabase: ServerSupabaseClient,
  ids: string[],
): Promise<Map<string, ProfileName>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique);

  if (error) {
    console.error("Could not load profiles:", error.message);
    return new Map();
  }
  return new Map(data.map((profile) => [profile.id, profile]));
}

async function loadThumbUrls(
  supabase: ServerSupabaseClient,
  photoIds: string[],
): Promise<Map<string, string | null>> {
  if (photoIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("photos")
    .select("id, thumb_s3_key")
    .in("id", photoIds);

  if (error) {
    console.error("Could not load activity thumbnails:", error.message);
    return new Map();
  }

  return new Map(data.map((photo) => [photo.id, proofImageUrl(photo.thumb_s3_key)]));
}
