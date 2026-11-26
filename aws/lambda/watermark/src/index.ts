import "./fontconfig";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import type { S3Event, S3EventRecord } from "aws-lambda";
import sharp from "sharp";

type PhotoStatus = "uploading" | "processing" | "ready" | "failed";

type PhotoUpdate = {
  status?: PhotoStatus;
  proof_s3_key?: string | null;
  thumb_s3_key?: string | null;
  width?: number | null;
  height?: number | null;
};

type Database = {
  public: {
    Tables: {
      photos: {
        Row: {
          id: string;
          album_id: string;
          master_s3_key: string | null;
          proof_s3_key: string | null;
          thumb_s3_key: string | null;
          status: PhotoStatus;
          width: number | null;
          height: number | null;
        };
        Insert: never;
        Update: PhotoUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const MASTER_KEY_PATTERN =
  /^masters\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_v(\d+))?\.(jpg|png|webp)$/;

const PROOF_LONG_EDGE = 1200;
const THUMB_WIDTH = 480;
const WEBP_QUALITY = 65;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
// Presigned uploads are capped at 100 MB; leave headroom but refuse
// anything that could exhaust Lambda memory.
const MAX_MASTER_BYTES = 150 * 1024 * 1024;

const WATERMARK_TEXT = process.env.WATERMARK_TEXT?.trim() || "PROOF";

sharp.cache(false);

const s3 = new S3Client({});

const supabase = createClient<Database>(
  requiredEnv("SUPABASE_URL").replace(/\/+$/, ""),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function handler(event: S3Event): Promise<void> {
  const failures: unknown[] = [];

  // Sequential on purpose: each master can be tens of megabytes decoded.
  for (const record of event.Records ?? []) {
    try {
      await processRecord(record);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    // Throwing lets Lambda's async retries pick up transient failures.
    throw new AggregateError(failures, `${failures.length} watermark job(s) failed`);
  }
}

async function processRecord(record: S3EventRecord): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = decodeS3Key(record.s3.object.key);
  const match = MASTER_KEY_PATTERN.exec(key);

  if (!match) {
    console.warn("Skipping object outside masters/{albumId}/{photoId}.{ext}", { key });
    return;
  }

  const [, albumId, photoId, versionPart] = match;
  const versionSuffix = versionPart ? `_v${versionPart}` : "";
  const log = { bucket, key, albumId, photoId, versionSuffix };

  // Claim the row. Rows already `ready` are skipped so duplicate S3
  // events do not briefly hide a finished photo from the client.
  const { data: claimed, error: claimError } = await supabase
    .from("photos")
    .update({ status: "processing" })
    .eq("id", photoId)
    .eq("album_id", albumId)
    .eq("master_s3_key", key)
    .in("status", ["uploading", "processing", "failed"])
    .select("id");

  if (claimError) {
    throw new Error(`Could not claim photo ${photoId}: ${claimError.message}`);
  }
  if (!claimed || claimed.length === 0) {
    console.warn("No pending photos row for this master; skipping", log);
    return;
  }

  try {
    const master = await downloadObject(bucket, key);
    const rendered = await renderDerivatives(master);

    const proofKey = `proofs/${albumId}/${photoId}${versionSuffix}_proof.webp`;
    const thumbKey = `proofs/${albumId}/${photoId}${versionSuffix}_thumb.webp`;

    await Promise.all([
      uploadWebp(bucket, proofKey, rendered.proof),
      uploadWebp(bucket, thumbKey, rendered.thumb),
    ]);

    await updatePhoto(photoId, albumId, {
      status: "ready",
      proof_s3_key: proofKey,
      thumb_s3_key: thumbKey,
      width: rendered.width,
      height: rendered.height,
    });

    console.info("Watermarked photo", { ...log, width: rendered.width, height: rendered.height });
  } catch (error) {
    console.error("Watermark job failed", { ...log, error: errorMessage(error) });
    await updatePhoto(photoId, albumId, { status: "failed" }).catch((updateError: unknown) => {
      console.error("Could not mark photo as failed", { ...log, error: errorMessage(updateError) });
    });
    throw error;
  }
}

async function downloadObject(bucket: string, key: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  if (response.ContentLength !== undefined && response.ContentLength > MAX_MASTER_BYTES) {
    throw new Error(`Master is ${response.ContentLength} bytes, above the ${MAX_MASTER_BYTES} limit`);
  }
  if (!response.Body) {
    throw new Error("S3 returned an empty body");
  }

  return Buffer.from(await response.Body.transformToByteArray());
}

type Derivatives = {
  proof: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

async function renderDerivatives(master: Buffer): Promise<Derivatives> {
  const metadata = await sharp(master).metadata();
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.autoOrient?.height ?? metadata.height;

  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }

  // Decode the master once, at proof size and without a watermark. The
  // thumbnail is derived from this base so each output gets a watermark
  // scaled to its own dimensions.
  const base = await sharp(master)
    .autoOrient()
    .resize({
      width: PROOF_LONG_EDGE,
      height: PROOF_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const thumbBase = await sharp(base.data, { raw: rawOptions(base.info) })
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [proof, thumb] = await Promise.all([
    watermarkToWebp(base.data, base.info),
    watermarkToWebp(thumbBase.data, thumbBase.info),
  ]);

  return { proof, thumb, width, height };
}

type RawInfo = { width: number; height: number; channels: number };

function rawOptions(info: RawInfo): sharp.Raw {
  if (info.channels !== 1 && info.channels !== 2 && info.channels !== 3 && info.channels !== 4) {
    throw new Error(`Unsupported channel count ${info.channels}`);
  }
  return { width: info.width, height: info.height, channels: info.channels };
}

async function watermarkToWebp(pixels: Buffer, info: RawInfo): Promise<Buffer> {
  const overlay = Buffer.from(watermarkSvg(info.width, info.height, WATERMARK_TEXT));

  return sharp(pixels, { raw: rawOptions(info) })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/**
 * Full-frame overlay with the studio text tiled on a rotated pattern.
 * Each tile also carries a faint rule, so the pixels stay marked even if
 * the font fails to load.
 */
function watermarkSvg(width: number, height: number, text: string): string {
  const fontSize = Math.max(12, Math.min(64, Math.round(Math.min(width, height) / 12)));
  const tileWidth = Math.round(fontSize * (text.length * 0.72 + 3));
  const tileHeight = Math.round(fontSize * 3.2);
  const strokeWidth = Math.max(1, Math.round(fontSize / 22));
  const baseline = Math.round(tileHeight / 2 + fontSize * 0.36);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="wm" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <line x1="0" y1="${tileHeight}" x2="${tileWidth}" y2="${tileHeight}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${strokeWidth}"/>
      <text x="${tileWidth / 2}" y="${baseline}" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="${fontSize}" fill="#ffffff" fill-opacity="0.34" stroke="#000000" stroke-opacity="0.2" stroke-width="${strokeWidth}">${escapeXml(text)}</text>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wm)"/>
</svg>`;
}

async function uploadWebp(bucket: string, key: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL,
    }),
  );
}

async function updatePhoto(photoId: string, albumId: string, update: PhotoUpdate): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .update(update)
    .eq("id", photoId)
    .eq("album_id", albumId);

  if (error) {
    throw new Error(`Could not update photo ${photoId}: ${error.message}`);
  }
}

/** S3 event keys are URL-encoded with `+` for spaces. */
function decodeS3Key(key: string): string {
  return decodeURIComponent(key.replace(/\+/g, " "));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
