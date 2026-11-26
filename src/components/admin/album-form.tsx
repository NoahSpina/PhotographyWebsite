"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { saveAlbum } from "@/app/(admin)/admin/albums/actions";
import {
  initialAlbumFormState,
  type AlbumField,
} from "@/lib/admin/album-actions-state";
import type { Album, Package } from "@/types";

export type AlbumFormAlbum = Pick<
  Album,
  | "id"
  | "title"
  | "slug"
  | "shoot_date"
  | "client_email"
  | "assigned_package_id"
  | "status"
  | "is_public_portfolio"
>;

export type AlbumFormPackage = Pick<Package, "id" | "name" | "is_active">;

type AlbumFormProps = {
  album?: AlbumFormAlbum;
  packages: AlbumFormPackage[];
};

const INPUT =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200";

export function AlbumForm({ album, packages }: AlbumFormProps) {
  const [state, formAction, pending] = useActionState(saveAlbum, initialAlbumFormState);
  const isEdit = Boolean(album);

  const packageOptions = packages.filter(
    (pkg) => pkg.is_active || pkg.id === album?.assigned_package_id,
  );

  // Submitting through startTransition (instead of the form `action` prop)
  // keeps the typed values when the server returns validation errors.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const fieldError = (field: AlbumField) =>
    state.fieldErrors[field] ? (
      <span className="mt-1 block text-xs text-red-700 dark:text-red-400">
        {state.fieldErrors[field]}
      </span>
    ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {album ? <input type="hidden" name="albumId" value={album.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block">Title</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={album?.title ?? ""}
            aria-invalid={Boolean(state.fieldErrors.title)}
            className={INPUT}
          />
          {fieldError("title")}
          {album ? (
            <span className="mt-1 block text-xs text-neutral-500">Slug: {album.slug}</span>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block">Shoot date</span>
          <input
            type="date"
            name="shootDate"
            defaultValue={album?.shoot_date ?? ""}
            aria-invalid={Boolean(state.fieldErrors.shootDate)}
            className={INPUT}
          />
          {fieldError("shootDate")}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block">Client email</span>
          <input
            type="email"
            name="clientEmail"
            autoComplete="off"
            defaultValue={album?.client_email ?? ""}
            aria-invalid={Boolean(state.fieldErrors.clientEmail)}
            className={INPUT}
          />
          {fieldError("clientEmail")}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block">Package override</span>
          <select
            name="packageId"
            defaultValue={album?.assigned_package_id ?? ""}
            aria-invalid={Boolean(state.fieldErrors.packageId)}
            className={INPUT}
          >
            <option value="">No override</option>
            {packageOptions.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
                {pkg.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
          {fieldError("packageId")}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block">Status</span>
          <select
            name="status"
            defaultValue={album?.status ?? "draft"}
            aria-invalid={Boolean(state.fieldErrors.status)}
            className={INPUT}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          {fieldError("status")}
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublicPortfolio"
          defaultChecked={album?.is_public_portfolio ?? false}
          className="size-4 cursor-pointer"
        />
        Show in the public portfolio
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white transition-colors enabled:hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:enabled:hover:bg-neutral-300"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create album"}
        </button>
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error"
                ? "text-sm text-red-700 dark:text-red-400"
                : "text-sm text-neutral-600 dark:text-neutral-300"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
