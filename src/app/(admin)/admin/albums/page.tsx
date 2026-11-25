import { Suspense } from "react";
import { AlbumForm } from "@/components/admin/album-form";
import { AlbumList } from "@/components/admin/album-list";
import { createClient } from "@/lib/supabase/server";

export default function AdminAlbumsPage() {
  return (
    <main className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Albums</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create client galleries, upload photos, and send gallery links.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading albums…</p>}>
        <AlbumsContent />
      </Suspense>
    </main>
  );
}

async function AlbumsContent() {
  const supabase = await createClient();
  const [albumsResult, packagesResult] = await Promise.all([
    supabase
      .from("albums")
      .select("id, title, status, shoot_date, client_email, is_public_portfolio")
      .order("created_at", { ascending: false }),
    supabase.from("packages").select("id, name, is_active").order("sort_order"),
  ]);

  if (albumsResult.error) {
    console.error("Could not load albums:", albumsResult.error.message);
  }
  if (packagesResult.error) {
    console.error("Could not load packages:", packagesResult.error.message);
  }

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">New album</h2>
        <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <AlbumForm packages={packagesResult.data ?? []} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">All albums</h2>
        {albumsResult.error ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            Albums could not be loaded.
          </p>
        ) : (
          <AlbumList albums={albumsResult.data ?? []} />
        )}
      </section>
    </>
  );
}
