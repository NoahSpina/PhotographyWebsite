type S3ObjectCreatedEvent = {
  Records?: Array<{
    s3?: {
      bucket?: { name?: string };
      object?: { key?: string };
    };
  }>;
};

export async function handler(event: S3ObjectCreatedEvent): Promise<void> {
  void event;
}
