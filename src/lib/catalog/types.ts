/**
 * Public catalog shapes handed from Server Components to Client Components.
 * Photos carry display URLs only, never S3 keys.
 */

export type FeedFrame = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Location or album title shown beneath the frame. */
  caption: string;
};

export type CollectionTier = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  highlights: string[];
};
