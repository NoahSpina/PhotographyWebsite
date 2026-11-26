import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Wordmark } from "@/components/layout/Wordmark";
import { signOut } from "@/lib/auth/sign-out";
import { getSiteViewer } from "@/lib/auth/viewer";
import { buttonClass } from "@/components/ui/button-styles";
import { formatLongDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your gallery",
  robots: { index: false, follow: false },
};

export default function GalleryIndexPage() {
  return (
    <Suspense fallback={<GalleryIndexFallback />}>
      <GalleryIndex />
    </Suspense>
  );
}

async function GalleryIndex() {
  // Supabase checks token expiry with Date.now(), which must not run during prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/gallery");

  const viewer = await getSiteViewer();
  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, title, shoot_date")
    .eq("client_id", userId)
    .eq("status", "published")
    .order("shoot_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Could not list client galleries:", error.message);
  }

  if (albums?.length === 1) {
    redirect(`/gallery/${albums[0].id}`);
  }

  const name = viewer?.name ?? "there";
  const isAdmin = viewer?.role === "admin";

  return (
    <div className="min-h-dvh bg-alabaster text-ink">
      <header className="border-b border-hairline">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <Wordmark />
          <div className="flex items-center gap-5">
            <p className="text-sm text-stone">Hello, {name}</p>
            <Link
              href="/"
              className="group cursor-pointer py-2 text-sm text-stone transition-colors duration-500 hover:text-ink"
            >
              <span className="underline-draw">Back to Studio</span>
            </Link>
            <form action={signOut} className="flex">
              <button type="submit" className={buttonClass({ variant: "outline", size: "sm" })}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container-page py-16">
        <p className="eyebrow text-stone">Your gallery</p>
        <h1 className="mt-4 font-serif text-5xl font-light tracking-[-0.03em]">Hello, {name}</h1>

        {error ? (
          <p className="mt-8 max-w-md text-sm text-red-800" role="alert">
            Your gallery could not be loaded. Refresh the page to try again.
          </p>
        ) : albums && albums.length > 0 ? (
          <ul className="mt-12 divide-y divide-hairline border-y border-hairline">
            {albums.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/gallery/${album.id}`}
                  className="group flex cursor-pointer flex-wrap items-baseline justify-between gap-3 py-6"
                >
                  <span className="font-serif text-3xl font-light">
                    <span className="underline-draw">{album.title}</span>
                  </span>
                  <span className="eyebrow text-stone transition-colors duration-500 group-hover:text-ink">
                    {album.shoot_date ? formatLongDate(album.shoot_date) : "Open gallery"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 max-w-md space-y-6 text-sm leading-relaxed text-stone">
            {isAdmin ? (
              <p>
                Studio accounts review a client&apos;s photographs from the album in the studio,
                where the client&apos;s hearts and notes are saved on their behalf.
              </p>
            ) : (
              <p>
                Nothing is published for you yet. When your photographs are ready, they&apos;ll
                show up here. Tap the heart on a photo to keep it, then use Selected Only to
                review the set.
              </p>
            )}
            <Link
              href={isAdmin ? "/admin/albums" : "/"}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              {isAdmin ? "Open albums" : "Return to the studio"}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function GalleryIndexFallback() {
  return (
    <div className="min-h-dvh bg-alabaster">
      <p className="sr-only" role="status">
        Loading your gallery…
      </p>
    </div>
  );
}
