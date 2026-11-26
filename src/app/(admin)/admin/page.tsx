import type { Metadata } from "next";
import { Suspense } from "react";
import { AlbumsOverview } from "@/components/admin/albums-overview";
import { KpiGrid } from "@/components/admin/kpi-grid";
import { RecentActivity } from "@/components/admin/recent-activity";
import { loadDashboard } from "@/lib/admin/review-data";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <main className="space-y-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Album status, client favorites, and retouching notes.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading dashboard…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const dashboard = await loadDashboard();

  return (
    <>
      {dashboard.warning ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {dashboard.warning}
        </p>
      ) : null}
      <KpiGrid
        albumCounts={dashboard.albumCounts}
        photoCounts={dashboard.photoCounts}
        selectionCount={dashboard.selectionCount}
        notesCount={dashboard.notesCount}
        storageBytes={dashboard.storageBytes}
        storagePartial={dashboard.storagePartial}
        stuckPhotoIds={dashboard.stuckPhotoIds}
      />
      <RecentActivity items={dashboard.activity} />
      <AlbumsOverview albums={dashboard.albums} albumTotal={dashboard.albumTotal} />
    </>
  );
}
