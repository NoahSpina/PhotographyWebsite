import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProofingGallery } from "@/components/gallery/proofing-gallery";
import { resolveAdminPreviewReturn } from "@/lib/admin/preview-return";
import { getAlbumEntitlement, getUpgradeOptions } from "@/lib/entitlements";
import { getSiteViewer } from "@/lib/auth/viewer";
import { getGalleryAccess } from "@/lib/gallery/access";
import { loadGalleryPhotos, loadGallerySelections } from "@/lib/gallery/data";

export const metadata: Metadata = {
  title: "Your gallery",
  robots: { index: false, follow: false },
};

type GalleryPageProps = {
  params: Promise<{ albumId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default function GalleryPage({ params, searchParams }: GalleryPageProps) {
  return (
    <Suspense fallback={<GalleryFallback />}>
      <Gallery params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Gallery({ params, searchParams }: GalleryPageProps) {
  const [{ albumId }, query] = await Promise.all([params, searchParams]);
  const access = await getGalleryAccess(albumId);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect(`/login?${new URLSearchParams({ next: `/gallery/${albumId}` })}`);
    }
    if (access.reason === "error") {
      throw new Error("The gallery could not be loaded.");
    }
    notFound();
  }

  const { supabase, album, isAdmin } = access;
  const viewer = await getSiteViewer();
  const clientId = album.client_id;

  const [photos, selections, entitlement] = await Promise.all([
    loadGalleryPhotos(supabase, album.id),
    clientId ? loadGallerySelections(supabase, album.id, clientId) : [],
    clientId ? getAlbumEntitlement(supabase, album, clientId) : null,
  ]);
  const upgradeOptions = await getUpgradeOptions(supabase, entitlement);

  return (
    <ProofingGallery
      signedInName={viewer?.name ?? null}
      album={{
        id: album.id,
        title: album.title,
        shootDateLabel: formatShootDate(album.shoot_date),
      }}
      photos={photos}
      initialSelections={selections}
      initialQuota={
        entitlement
          ? {
              downloadLimit: entitlement.downloadLimit,
              downloadsUnlocked: entitlement.downloadsUnlocked,
            }
          : null
      }
      upgradeOptions={upgradeOptions}
      adminPreview={
        isAdmin
          ? {
              clientEmail: album.client_email,
              status: album.status,
              ...resolveAdminPreviewReturn(query.from, album.id),
            }
          : null
      }
    />
  );
}

const shootDateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

function formatShootDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : shootDateFormat.format(date);
}

function GalleryFallback() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-3 sm:px-6">
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-2 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="aspect-[3/2] animate-pulse rounded-sm bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading your gallery…
      </p>
    </div>
  );
}
