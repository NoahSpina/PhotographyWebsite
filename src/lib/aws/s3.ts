import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@/lib/env";
import { isUuid } from "@/lib/validation";

const MAX_PRESIGN_SECONDS = 60 * 60;

type S3Context = {
  client: S3Client;
  bucket: string;
};

let context: S3Context | undefined;

function getS3(): S3Context {
  if (context) return context;

  const { aws } = getServerEnv();
  if (!aws.region || !aws.s3BucketName) {
    throw new Error(
      "AWS_REGION and AWS_S3_BUCKET_NAME must be set in .env.local before uploads or downloads can be signed.",
    );
  }

  const client = new S3Client({
    region: aws.region,
    // Fall back to the default provider chain (e.g. an IAM role) when no
    // static keys are configured.
    credentials:
      aws.accessKeyId && aws.secretAccessKey
        ? { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey }
        : undefined,
    // The SDK's default flexible checksums get baked into presigned URLs as
    // a checksum of an empty body, which makes browser PUTs fail.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  context = { client, bucket: aws.s3BucketName };
  return context;
}

export function getS3Client(): S3Client {
  return getS3().client;
}

function assertMasterIds(albumId: string, photoId: string, extension: string) {
  if (!isUuid(albumId) || !isUuid(photoId)) {
    throw new Error("Master keys require UUID album and photo ids.");
  }
  if (!/^[a-z0-9]{2,5}$/.test(extension)) {
    throw new Error(`Invalid file extension "${extension}".`);
  }
}

export function masterObjectKey(albumId: string, photoId: string, extension: string): string {
  assertMasterIds(albumId, photoId, extension);
  return `masters/${albumId}/${photoId}.${extension}`;
}

export function versionedMasterObjectKey(
  albumId: string,
  photoId: string,
  version: number,
  extension: string,
): string {
  assertMasterIds(albumId, photoId, extension);
  if (!Number.isInteger(version) || version < 2) {
    throw new Error("Versioned master keys require an integer version of 2 or greater.");
  }
  return `masters/${albumId}/${photoId}_v${version}.${extension}`;
}

const DELETE_CHUNK_SIZE = 1000;

/**
 * Deletes objects by key. Dedupes and drops empty values. Throws if S3 reports
 * per-object errors (DeleteObjects can return HTTP 200 with Errors[]).
 */
export async function deleteS3Objects(keys: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(keys.map((key) => key?.trim()).filter((key): key is string => !!key))];
  if (unique.length === 0) return;

  const { client, bucket } = getS3();
  const failures: string[] = [];

  for (let offset = 0; offset < unique.length; offset += DELETE_CHUNK_SIZE) {
    const chunk = unique.slice(offset, offset + DELETE_CHUNK_SIZE);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    for (const error of response.Errors ?? []) {
      failures.push(`${error.Key ?? "unknown"}: ${error.Message ?? error.Code ?? "failed"}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`S3 delete failed for ${failures.length} object(s): ${failures.join("; ")}`);
  }
}

/** Returns false when the object is missing; throws on other errors. */
export async function masterObjectExists(key: string): Promise<boolean> {
  const { client, bucket } = getS3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : undefined;
    if (code === "NotFound" || code === "NoSuchKey") return false;
    throw error;
  }
}

function assertExpiry(expiresIn: number) {
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > MAX_PRESIGN_SECONDS) {
    throw new Error(`Presigned URL lifetime must be between 1 and ${MAX_PRESIGN_SECONDS} seconds.`);
  }
}

/**
 * Signs a browser PUT straight to S3. Content-Type and Content-Length are
 * part of the signature, so S3 rejects a different file type or size.
 * Only `masters/` keys may be written from the app; proofs come from Lambda.
 */
export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn: number;
}): Promise<string> {
  if (!input.key.startsWith("masters/")) {
    throw new Error("The app may only sign uploads under masters/.");
  }
  if (!Number.isInteger(input.contentLength) || input.contentLength <= 0) {
    throw new Error("contentLength must be a positive integer.");
  }
  assertExpiry(input.expiresIn);

  const { client, bucket } = getS3();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });

  return getSignedUrl(client, command, {
    expiresIn: input.expiresIn,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/**
 * Signs a short-lived GET. Callers must verify entitlement first; this is
 * the only way clean `masters/` files ever leave the bucket.
 */
export async function createPresignedGetUrl(input: {
  key: string;
  expiresIn: number;
  downloadFileName?: string;
}): Promise<string> {
  assertExpiry(input.expiresIn);

  const { client, bucket } = getS3();
  const fileName = input.downloadFileName?.replace(/[^\w.\- ]+/g, "_").trim();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentDisposition: fileName ? `attachment; filename="${fileName}"` : undefined,
  });

  return getSignedUrl(client, command, { expiresIn: input.expiresIn });
}
