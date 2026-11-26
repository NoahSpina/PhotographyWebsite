"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useReelScroll } from "@/components/home/use-reel-scroll";
import { Lightbox } from "@/components/ui/Lightbox";
import { buttonClass } from "@/components/ui/button-styles";
import type { FeedFrame } from "@/lib/catalog/types";
import { padIndex } from "@/lib/format";

type HeroPhotoFeedProps = {
  frames: FeedFrame[];
};

const MIN_REEL = 8;

export function HeroPhotoFeed({ frames }: HeroPhotoFeedProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reel = buildReel(frames);
  const { sectionRef, viewportRef, trackRef } = useReelScroll({
    frameCount: reel.length,
    paused: paused || openIndex !== null,
  });

  return (
    <section
      ref={sectionRef}
      id="portfolio"
      data-hero-overlay
      aria-label="Featured photographs"
      className="relative z-0 -mt-16 h-svh touch-pan-y overflow-hidden overscroll-x-contain bg-charcoal lg:-mt-20"
    >
      {reel.length > 0 ? (
        <div ref={viewportRef} className="h-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex h-full w-max select-none items-end will-change-transform"
          >
            <Reel frames={frames} reel={reel} onOpen={setOpenIndex} priority />
            <Reel frames={frames} reel={reel} onOpen={setOpenIndex} hidden />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-end px-6 pb-36 sm:px-10">
          <p className="max-w-xl font-serif text-4xl font-light leading-tight text-alabaster sm:text-5xl">
            New photographs are being added to the portfolio.
          </p>
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-charcoal/40 to-transparent sm:w-16"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-charcoal/40 to-transparent sm:w-16"
      />

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-charcoal via-charcoal/55 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-24 sm:px-8 sm:pb-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4 text-alabaster">
            <span aria-hidden="true" className="relative hidden h-12 w-px overflow-hidden bg-alabaster/30 sm:block">
              <span className="animate-scroll-cue absolute inset-x-0 top-0 h-1/2 w-full bg-alabaster" />
            </span>
            <a href="#about" className="eyebrow group cursor-pointer py-2 text-alabaster">
              <span className="underline-draw">Scroll to Explore</span>
            </a>
            {reel.length > 0 ? (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Play photo carousel" : "Pause photo carousel"}
                className="eyebrow group py-2 text-alabaster/65 transition-colors duration-500 hover:text-alabaster"
              >
                <span className="underline-draw">{paused ? "Play" : "Pause"}</span>
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link href="/book" className={buttonClass({ variant: "light", size: "sm" })}>
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book a Session</span>
            </Link>
            <Link href="/#offerings" className={buttonClass({ variant: "outline-light", size: "sm" })}>
              <span className="sm:hidden">Offerings</span>
              <span className="hidden sm:inline">View Offerings</span>
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {openIndex !== null ? (
          <Lightbox
            key="hero-lightbox"
            images={frames}
            index={openIndex}
            label="Featured photographs"
            onIndexChange={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function buildReel(frames: FeedFrame[]): FeedFrame[] {
  if (frames.length === 0) return [];
  if (frames.length >= MIN_REEL) return frames;
  return Array.from({ length: MIN_REEL }, (_, index) => frames[index % frames.length]);
}

function Reel({
  frames,
  reel,
  onOpen,
  hidden = false,
  priority = false,
}: {
  frames: FeedFrame[];
  reel: FeedFrame[];
  onOpen: (index: number) => void;
  hidden?: boolean;
  priority?: boolean;
}) {
  const seen = new Set<string>();

  return (
    <div className="flex h-full items-end gap-3 pr-3 sm:gap-4 sm:pr-4" aria-hidden={hidden || undefined}>
      {reel.map((frame, position) => {
        const sourceIndex = Math.max(
          frames.findIndex((item) => item.id === frame.id),
          0,
        );
        const repeat = seen.has(frame.id);
        seen.add(frame.id);
        const portrait = frame.height > frame.width;

        return (
          <button
            key={`${frame.id}-${position}`}
            type="button"
            tabIndex={hidden || repeat ? -1 : undefined}
            onClick={() => onOpen(sourceIndex)}
            aria-label={hidden ? undefined : `Open photograph, ${frame.caption}`}
            className={`group relative shrink-0 overflow-hidden focus-visible:outline-offset-[-4px] ${
              portrait
                ? "aspect-[3/4] h-auto w-[72vw] sm:h-[62vh] sm:w-auto lg:h-[calc(100svh-9rem)]"
                : "aspect-[4/3] h-auto w-[84vw] sm:h-[44vh] sm:w-auto lg:h-[calc(100svh-16rem)]"
            }`}
          >
            <Image
              src={frame.src}
              alt={hidden ? "" : frame.alt}
              fill
              sizes="(max-width: 768px) 78vw, 34vw"
              priority={priority && position < 3}
              loading={position < 4 ? "eager" : "lazy"}
              draggable={false}
              className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105 group-focus-visible:scale-105"
            />
            <span className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-charcoal/70 to-transparent px-4 pt-4 pb-14 text-left">
              <span className="eyebrow text-alabaster">
                {padIndex(sourceIndex + 1)} — {frame.caption}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
