import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SelectionReviewPanel } from "@/components/admin/selection-review";
import { SelectionReviewHeader } from "@/components/admin/selection-review-header";
import { loadSelectionReview } from "@/lib/admin/review-data";

export const metadata: Metadata = {
  title: "Selections",
  robots: { index: false, follow: false },
};

type SelectionsPageProps = {
  params: Promise<{ albumId: string }>;
};

export default function AdminSelectionsPage({ params }: SelectionsPageProps) {
  return (
    <main className="space-y-8">
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading selections…</p>}>
        <SelectionsContent params={params} />
      </Suspense>
    </main>
  );
}

async function SelectionsContent({ params }: SelectionsPageProps) {
  const { albumId } = await params;
  const review = await loadSelectionReview(albumId);
  if (!review) notFound();

  return (
    <>
      <SelectionReviewHeader album={review.album} />
      <SelectionReviewPanel
        albumId={review.album.id}
        albumSlug={review.album.slug}
        photos={review.photos}
      />
    </>
  );
}
