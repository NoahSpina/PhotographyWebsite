# Repo map

Read this before searching the tree. After a change that adds or renames a route, a `public` column, or a `src/lib/` export, patch the matching line.

Route groups `(public)`, `(auth)`, `(client)`, `(admin)` are omitted from the URL. `src/proxy.ts` refreshes the Supabase session and redirects anonymous users away from `/admin` and `/gallery`; admin pages also require `profiles.role = 'admin'`.

## App routes

### Public — `src/app/(public)/`
- `/` — Home: hero, studio, offerings, journal.
- `/journal` — Index of static journal stories.
- `/journal/[slug]` — One static journal story.
- `/book` — Booking page; mailto inquiry only.

### Auth — `src/app/(auth)/`
- `/login` — Magic-link sign-in form.
- `GET /auth/callback` — Exchange PKCE code for session.
- `GET /auth/confirm` — Verify email OTP / magic link.

### Client — `src/app/(client)/`
- `/gallery` — Signed-in client's published albums.
- `/gallery/[albumId]` — Proofing grid, favorites, notes.

### Admin — `src/app/(admin)/admin/`
- `/admin` — Dashboard: KPIs, albums, activity.
- `/admin/albums` — Create an album; list albums.
- `/admin/albums/[albumId]` — Edit album; upload and manage photos.
- `/admin/albums/[albumId]/selections` — Review favorites, notes, retouch replies.
- `/admin/orders` — Placeholder orders page.

### API — `src/app/api/`
- `POST /api/uploads/presign` — Admin pre-signed PUT for a new master.
- `GET /api/downloads/presign` — Stub. Returns 501.
- `DELETE /api/admin/photos/[photoId]` — Delete one photo and its S3 keys.
- `POST /api/admin/photos/bulk-delete` — Delete many photos and their S3 keys.
- `POST /api/admin/photos/cleanup-stuck` — Remove stuck uploading/processing rows.
- `POST /api/admin/photos/[photoId]/replace` — Begin a versioned master replace.
- `POST /api/admin/photos/[photoId]/replace/finalize` — Commit replace; drop old keys.
- `POST /api/admin/photos/[photoId]/replace/abort` — Cancel an in-progress replace.
- `PATCH /api/admin/selections/[selectionId]` — Set retouch status and studio reply.
- `POST /api/stripe/checkout` — Stub. Returns 501.
- `POST /api/stripe/webhook` — Stub. Returns 501.
- `GET /api/health` — Service-role DB ping / keep-alive.

### Server actions
- `src/app/(client)/gallery/actions.ts` — `toggleSelection`, `saveSelectionNote`
- `src/app/(admin)/admin/albums/actions.ts` — `saveAlbum`, `publishAlbumAndSendLink`, `discardPendingUpload`
- `src/app/(admin)/admin/actions.ts` — `signOut`

### Layouts
- `src/app/layout.tsx` — Root fonts (Cormorant, Plus Jakarta) and metadata.
- `src/app/(public)/layout.tsx` — Navbar, footer, `MotionProvider`.
- `src/app/(admin)/admin/layout.tsx` — Admin frame; redirects non-admins.

UI lives in `src/components/{admin,gallery,home,journal,layout,ui}`. Static journal copy is `src/data/journal.ts` (`journalStories`, `getStory`, `getNextStory`).

## Database schema

Migrations: `supabase/migrations/0001_initial_schema.sql`, `0002_client_proofing.sql`, `0003_photo_management.sql`. Contract: `src/types/database.ts` (no Postgres enums; `Enums` is empty). RLS is on for every `public` table. Admin checks use `private.is_admin()`. `private.set_updated_at()` maintains `updated_at`.

- `profiles(id pk fk auth.users cascade, email, full_name, phone, role, created_at, updated_at)` — check `role in (admin, client)`; partial unique `email`.
- `packages(id, name unique, description, price_cents, download_limit, includes_prints, extra_photo_price_cents, is_active, sort_order)` — checks: name non-blank, `price_cents >= 0`, `download_limit` null or `> 0` (null = unlimited), `extra_photo_price_cents >= 0`.
- `albums(id, title, slug unique, shoot_date, client_id, client_email, status, cover_photo_id, assigned_package_id, is_public_portfolio, created_at, updated_at)` — check `status in (draft, published, archived)`, slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`; fk `client_id` → `profiles` set null, `assigned_package_id` → `packages` set null, `cover_photo_id` → `photos` set null (deferred).
- `photos(id, album_id, master_s3_key, proof_s3_key, thumb_s3_key, status, width, height, sort_order, exif, file_size_bytes, version, superseded_s3_keys, created_at, updated_at)` — check `status in (uploading, processing, ready, failed)`, `version >= 1`, `file_size_bytes` null or `>= 0`, `exif` object; fk `album_id` → `albums` cascade; unique `(id, album_id)`.
- `selections(id, album_id, photo_id, client_id, notes, retouch_status, admin_reply, admin_replied_at, created_at)` — check `retouch_status in (pending, in_progress, completed, declined)`, `notes`/`admin_reply` null or `<= 2000`; unique `(album_id, photo_id, client_id)`; fk album/photo/client cascade, plus `(photo_id, album_id)` → `photos(id, album_id)`.
- `orders(id, client_id, album_id, package_id, order_type, status, amount_cents, download_limit_granted, stripe_checkout_session_id unique, stripe_payment_intent_id, session_date, booking_notes, created_at, updated_at)` — check `order_type in (booking, gallery_upgrade, extra_photos)`, `status in (pending, paid, refunded)`, `amount_cents >= 0`, `download_limit_granted` null (unlimited) or `>= 0`; fk client/package restrict, `album_id` → `albums` set null.

Clients cannot insert `selections` (quota is enforced in `toggleSelection` with the service role). They may update `notes` only. Retouch columns are trigger-locked to admins.

## Core helpers (`src/lib/`)

- `supabase/server.ts` — `createClient`, `createSessionlessClient`
- `supabase/client.ts` — `createClient` (browser)
- `supabase/admin.ts` — `createAdminClient` (service role, `server-only`, bypasses RLS)
- `supabase/public.ts` — `createPublicClient` (anon, `server-only`, no cookies)
- `supabase/proxy.ts` — `updateSession`
- `aws/s3.ts` — `getS3Client`, `masterObjectKey`, `versionedMasterObjectKey`, `deleteS3Objects`, `masterObjectExists`, `createPresignedPutUrl`, `createPresignedGetUrl`
- `aws/cloudfront.ts` — `isProofKey`, `proofUrl` (`proofs/*` only)
- `stripe/stripe.ts` — `getStripe`
- `entitlements.ts` — `resolveEntitlement`, `getAlbumEntitlement`, `countSelections`, `getUpgradeOptions`
- `env.ts` — `publicEnv`, `getServerEnv` (throws in the browser)
- `site-config.ts` — `siteConfig`
- `auth/admin.ts` — `verifyAdmin`
- `auth/viewer.ts` — `getSiteViewer`
- `auth/destination.ts` — `resolveSignInDestination`
- `auth/paths.ts` — `safeInternalPath`, `internalPathFromRedirect`, `destinationAfterSignIn`, `loginErrorMessage`
- `auth/magic-link.ts` — `generateMagicLink`
- `auth/sign-out.ts` — `signOut`
- `uploads.ts` — `isAllowedImageType`, `formatBytes`; `ALLOWED_IMAGE_TYPES`, `IMAGE_EXTENSIONS`, `MAX_UPLOAD_BYTES` (30MB), `UPLOAD_URL_TTL_SECONDS`, `UPLOAD_CONCURRENCY`
- `admin/replace-photo.ts` — `beginPhotoReplace`, `finalizePhotoReplace`, `abortPhotoReplace`, `parseReplaceBody`, `snapshotKeys`
- `admin/photo-replace-client.ts` — `validateReplaceFile`, `requestReplaceUpload`, `finalizeReplaceUpload`, `abortReplaceUpload`, `putWithProgress`
- `admin/delete-photos.ts` — `deletePhotosByIds`, `MAX_BULK_DELETE`
- `admin/cleanup-stuck.ts` — `isStuckPhoto`, `cleanupStuckPhotos`
- `admin/review-data.ts` — `requireAdminClient`, `loadDashboard`, `loadSelectionRollups`, `loadSelectionReview`
- `admin/review.ts` — `formatSelectionQuota`, `formatClientLabel`, `noteText`
- `admin/photos.ts` — `ALBUM_PHOTO_COLUMNS`
- `admin/storage.ts` — `coerceFileSizeBytes`, `formatStorageFootprint`, `estimateMonthlyStorageCost`, `formatAlbumStorage`
- `admin/preview-return.ts` — `resolveAdminPreviewReturn`, `galleryPreviewHref`
- `admin/album-actions-state.ts` — `sendsMagicLinkEmails`, `initialAlbumFormState`, `initialPublishAlbumState`
- `gallery/access.ts` — `getGalleryAccess`
- `gallery/data.ts` — `loadGalleryPhotos`, `loadGallerySelections`
- `gallery/types.ts` — `normalizeNote`, `NOTE_MAX_LENGTH`
- `catalog/data.ts` — `getHeroFrames`, `getStudioCollections`
- `format.ts` — `formatPrice`, `formatDollars`, `formatLongDate`, `padIndex`, `formatTimestamp`, `formatRelativeTimestamp`
- `validation.ts` — `isUuid`, `isEmail`
- `media.ts` — `unsplash`, `isPortrait`
- `motion.ts` — `EASE_LUXE`

Row aliases (`Profile`, `Album`, `Photo`, `Selection`, `Order`, status unions) are re-exported from `src/types/index.ts`.

## Isolated sub-project

`aws/lambda/watermark/` is a separate package. Entry: `src/index.ts` `handler` (`index.handler`). Root `tsconfig.json` excludes `aws/`. Do not import `src/` from the Lambda, or the Lambda from the Next.js app.

S3 `ObjectCreated` on `masters/` only. Key map: `masters/{albumId}/{photoId}.{jpg|png|webp}` or `masters/{albumId}/{photoId}_v{n}.{ext}` (n ≥ 2) → `proofs/{albumId}/{photoId}[_v{n}]_proof.webp` and `_thumb.webp`. Proofs are immutable (`Cache-Control` max-age 1 year). Never trigger the function on `proofs/`.

## Current status

- Implemented: marketing site, magic-link auth, admin albums, direct-to-S3 upload, photo delete/replace, watermark Lambda, client proofing (favorites, notes, quota), admin selection review.
- Stubbed: `POST /api/stripe/checkout`, `POST /api/stripe/webhook`, and `GET /api/downloads/presign` return 501. `/admin/orders` is a placeholder. Gallery upsell and dashboard revenue are still TODOs.
- Email: no Resend client. `sendsMagicLinkEmails()` uses Supabase magic-link mail only when `NODE_ENV=production`; other environments return a copyable link.
