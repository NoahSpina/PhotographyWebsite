"use client";

import Image from "next/image";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";
import { padIndex } from "@/lib/format";
import type { SiteImage } from "@/lib/media";

type StoryGalleryProps = {
  images: SiteImage[];
  title: string;
};

export function StoryGallery({ images, title }: StoryGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section className="container-page pb-8" aria-label="Photographs from the day">
      <p className="eyebrow text-stone">The Photographs</p>
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((image, index) => (
          <figure key={image.src} className="mb-4 break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open photograph ${padIndex(index + 1)}`}
              className="group block w-full overflow-hidden bg-linen"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="h-auto w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105 group-focus-visible:scale-105"
              />
            </button>
            <figcaption className="mt-3">
              <span className="eyebrow text-stone">{padIndex(index + 1)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null ? (
          <Lightbox
            key="story-lightbox"
            images={images}
            index={openIndex}
            label={title}
            onIndexChange={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
