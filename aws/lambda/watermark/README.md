# Watermark Lambda

Runs on S3 `ObjectCreated` events under `masters/`. For each
`masters/{albumId}/{photoId}.{jpg|png|webp}` or versioned
`masters/{albumId}/{photoId}_v{n}.{jpg|png|webp}` it:

1. Marks the `photos` row `processing` (rows already `ready` are skipped).
2. Downloads the master, auto-orients it, and reads its dimensions.
3. Writes two watermarked WebP files (quality 65) with
   `Cache-Control: public, max-age=31536000, immutable`:
   - `proofs/{albumId}/{photoId}_proof.webp` or `{photoId}_v{n}_proof.webp`, max 1200px long edge
   - `proofs/{albumId}/{photoId}_thumb.webp` or `{photoId}_v{n}_thumb.webp`, max 480px wide
4. Sets `proof_s3_key`, `thumb_s3_key`, `width`, `height`, and
   `status = 'ready'`, or `status = 'failed'` on error. Failures are
   rethrown so Lambda's async retries can recover transient errors.

This package is independent of the Next.js app. Do not import from `src/`.

## Build and package

`sharp` ships native binaries per platform, so the zip must contain the
Linux build that matches the function's architecture. Run from this folder
(npm 10+):

```bash
npm ci
npm run build                 # tsc -> dist/, plus dist/fonts/

# Replace node_modules with production deps for the Lambda platform.
# Use --cpu=x64 for an x86_64 function.
rm -rf node_modules
npm ci --omit=dev --os=linux --cpu=arm64 --libc=glibc

cp -R node_modules dist/
(cd dist && zip -qr ../watermark.zip .)

npm ci                        # restore local dev dependencies
```

Upload `watermark.zip` with:

- Runtime: Node.js 22.x (or 20.x)
- Architecture: matches the `--cpu` used above
- Handler: `index.handler`
- Memory: 2048 MB recommended (large masters are decoded in memory)
- Timeout: 60 seconds

`npm run typecheck` verifies the TypeScript without emitting.

## Environment variables

| Name                        | Required | Notes                                         |
| --------------------------- | -------- | --------------------------------------------- |
| `SUPABASE_URL`              | yes      | `https://<project-ref>.supabase.co`           |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | Secret key; bypasses RLS to update `photos`   |
| `WATERMARK_TEXT`            | no       | Tiled watermark text. Defaults to `PROOF`     |

`FONTCONFIG_PATH` is set automatically to the bundled `fonts/` folder.
The Lambda runtime has no system fonts, and without them the SVG
watermark text would render blank.

## S3 trigger

On the bucket: Properties > Event notifications > Create:

- Event types: `s3:ObjectCreated:*`
- Prefix: `masters/`
- Destination: this Lambda function

Never add a trigger on `proofs/`; the function writes there and would
invoke itself.

## IAM

Execution role, in addition to `AWSLambdaBasicExecutionRole` for logs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET/masters/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET/proofs/*"
    }
  ]
}
```

If the bucket uses SSE-KMS, also allow `kms:Decrypt` and
`kms:GenerateDataKey` on the key. Creating the trigger in the console
adds the resource policy that lets S3 invoke the function.

## Bucket CORS (for browser uploads from the admin app)

The admin uploader PUTs directly to presigned URLs, so the bucket needs:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR_APP_DOMAIN"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

The Next.js app's IAM user needs `s3:PutObject` on `masters/*` to sign
uploads (and `s3:GetObject` on `masters/*` for later download links).
