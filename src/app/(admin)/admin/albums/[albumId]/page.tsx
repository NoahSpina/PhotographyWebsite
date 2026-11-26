import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlbumAdminActions, AlbumAdminBackNav } from "@/components/admin/album-admin-nav";
import { AlbumForm } from "@/components/admin/album-form";
import { AlbumPhotos } from "@/components/admin/album-photos";
import { PublishAlbumButton } from "@/components/admin/publish-album-button";
import { AlbumStatusBadge } from "@/components/admin/status-badge";
import { ALBUM_PHOTO_COLUMNS } from "@/lib/admin/photos";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

type AlbumPageProps = {
  params: Promise<{ albumId: string }>;
};

export default function AdminAlbumPage({ params }: AlbumPageProps) {
  return (
    <main className="space-y-10">
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading album…</p>}>
        <AlbumDetail params={params} />
      </Suspense>
    </main>
  );
}

async function AlbumDetail({ params }: AlbumPageProps) {
  const { albumId } = await params;
  if (!isUuid(albumId)) notFound();

  const supabase = await createClient();
  const [albumResult, packagesResult, photosResult, selectionsResult] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "id, title, slug, shoot_date, client_email, assigned_package_id, status, is_public_portfolio",
      )
      .eq("id", albumId)
      .maybeSingle(),
    supabase.from("packages").select("id, name, is_active").order("sort_order"),
    supabase
      .from("photos")
      .select(ALBUM_PHOTO_COLUMNS)
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("selections").select("photo_id").eq("album_id", albumId),
  ]);

  if (albumResult.error) {
    console.error("Could not load album:", albumResult.error.message);
    throw new Error("The album could not be loaded.");
  }
  const album = albumResult.data;
  if (!album) notFound();

  if (packagesResult.error) {
    console.error("Could not load packages:", packagesResult.error.message);
  }
  if (photosResult.error) {
    console.error("Could not load photos:", photosResult.error.message);
  }
  if (selectionsResult.error) {
    console.error("Could not load selections:", selectionsResult.error.message);
  }

  const selectedPhotoIds = [
    ...new Set((selectionsResult.data ?? []).map((row) => row.photo_id)),
  ];

  const previewFrom = `/admin/albums/${album.id}`;

  return (
    <>
      <header className="space-y-6">
        <AlbumAdminBackNav albumId={album.id} variant="settings" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
            <AlbumStatusBadge status={album.status} />
          </div>
          <AlbumAdminActions
            albumId={album.id}
            previewFrom={previewFrom}
            showSettingsLink={false}
          />
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 text-lg font-medium">Details</h2>
          <AlbumForm key={album.id} album={album} packages={packagesResult.data ?? []} />
        </div>
        <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 text-lg font-medium">Client access</h2>
          <PublishAlbumButton
            albumId={album.id}
            status={album.status}
            clientEmail={album.client_email}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Photos</h2>
        {photosResult.error ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            Photos could not be loaded.
          </p>
        ) : (
          <AlbumPhotos
            key={album.id}
            albumId={album.id}
            initialPhotos={photosResult.data ?? []}
            selectedPhotoIds={selectedPhotoIds}
          />
        )}
      </section>
    </>
  );
}
