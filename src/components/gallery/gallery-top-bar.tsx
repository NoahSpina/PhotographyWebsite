"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth/sign-out";
import type { GalleryQuota } from "@/lib/gallery/types";

export type GalleryFilter = "all" | "selected";

type GalleryTopBarProps = {
  signedInName: string | null;
  title: string;
  shootDateLabel: string | null;
  photoCount: number;
  selectedCount: number;
  /** null when the album has no client to select for. */
  quota: GalleryQuota | null;
  filter: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
  onUpgrade: () => void;
  onDownloadSelected: () => void;
};

export function GalleryTopBar({
  signedInName,
  title,
  shootDateLabel,
  photoCount,
  selectedCount,
  quota,
  filter,
  onFilterChange,
  onUpgrade,
  onDownloadSelected,
}: GalleryTopBarProps) {
  const details = [shootDateLabel, `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`]
    .filter(Boolean)
    .join(" · ");
  const downloadBlocker = downloadBlockReason(quota, selectedCount);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-background/90 backdrop-blur dark:border-neutral-800">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="min-w-56 flex-1">
          {signedInName ? <p className="text-sm text-neutral-500">Hello, {signedInName}</p> : null}
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-neutral-500">{details}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SelectionCounter selectedCount={selectedCount} quota={quota} />

          <div
            role="group"
            aria-label="Filter photos"
            className="inline-flex rounded-md border border-neutral-300 p-0.5 text-sm dark:border-neutral-700"
          >
            <FilterButton active={filter === "all"} onClick={() => onFilterChange("all")}>
              All Photos
            </FilterButton>
            <FilterButton active={filter === "selected"} onClick={() => onFilterChange("selected")}>
              Selected Only ({selectedCount})
            </FilterButton>
          </div>

          {quota && quota.downloadLimit !== null ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Upgrade Package
            </button>
          ) : null}

          <button
            type="button"
            onClick={onDownloadSelected}
            disabled={downloadBlocker !== null}
            title={downloadBlocker ?? undefined}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm enabled:hover:border-neutral-500 disabled:opacity-50 dark:border-neutral-700"
          >
            Download Selected
          </button>

          <Link
            href="/"
            className="cursor-pointer px-1 text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-50"
          >
            Studio
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="px-1 text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function SelectionCounter({
  selectedCount,
  quota,
}: {
  selectedCount: number;
  quota: GalleryQuota | null;
}) {
  if (!quota) {
    return <p className="text-sm text-neutral-500">Selections unavailable</p>;
  }

  if (quota.downloadLimit === null) {
    return (
      <p aria-live="polite" className="text-sm">
        <span className="font-medium">Unlimited Gallery</span>
        <span className="text-neutral-500"> · {selectedCount} selected</span>
      </p>
    );
  }

  const limit = quota.downloadLimit;
  const tone =
    selectedCount > limit
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      : selectedCount === limit && limit > 0
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200";
  const label =
    limit === 0 && selectedCount === 0
      ? "No photos included yet"
      : `${selectedCount} of ${limit} photos selected`;

  return (
    <p aria-live="polite" className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}>
      {label}
    </p>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded px-3 py-1 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "rounded px-3 py-1 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50"
      }
    >
      {children}
    </button>
  );
}

function downloadBlockReason(quota: GalleryQuota | null, selectedCount: number): string | null {
  if (!quota) return "This album has no client yet.";
  if (!quota.downloadsUnlocked) return "Choose a package to unlock high-res downloads.";
  if (selectedCount === 0) return "Select photos to download them.";
  if (quota.downloadLimit !== null && selectedCount > quota.downloadLimit) {
    return `Your package includes ${quota.downloadLimit} photos. Deselect some or upgrade.`;
  }
  return null;
}
