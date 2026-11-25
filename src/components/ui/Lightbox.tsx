"use client";

import Image, { getImageProps } from "next/image";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, type KeyboardEvent } from "react";
import { useMotionDialog } from "@/components/ui/use-motion-dialog";
import { padIndex } from "@/lib/format";
import type { SiteImage } from "@/lib/media";
import { EASE_LUXE } from "@/lib/motion";

export type LightboxImage = SiteImage & { caption?: string };

type LightboxProps = {
  images: LightboxImage[];
  index: number;
  /** Accessible name for the viewer, such as the story title. */
  label: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const SIZES = "100vw";
const SWIPE_DISTANCE = 80;

/** Full-screen photo viewer. Render it inside `AnimatePresence` so it can fade out. */
export function Lightbox({ images, index, label, onIndexChange, onClose }: LightboxProps) {
  const { dialogRef, dialogProps } = useMotionDialog(onClose);
  const count = images.length;
  const image = images[index];

  useEffect(() => {
    if (count < 2) return;
    for (const offset of [1, -1]) {
      const neighbor = images[(index + offset + count) % count];
      const { props } = getImageProps({ src: neighbor.src, alt: "", fill: true, sizes: SIZES });
      const preload = new window.Image();
      preload.sizes = SIZES;
      if (props.srcSet) preload.srcset = props.srcSet;
      preload.src = props.src;
    }
  }, [images, index, count]);

  if (!image) return null;

  const show = (next: number) => onIndexChange((next + count) % count);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (count < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    }
  }

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x <= -SWIPE_DISTANCE) show(index + 1);
    else if (info.offset.x >= SWIPE_DISTANCE) show(index - 1);
  }

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      onKeyDown={handleKeyDown}
      aria-label={label}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0 text-alabaster backdrop:bg-transparent"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-charcoal/[0.97]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_LUXE }}
      />

      <motion.div
        className="relative flex h-full flex-col"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
          <p className="eyebrow tabular-nums text-alabaster/60">
            {padIndex(index + 1)} / {padIndex(count)}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="-mr-2 flex size-11 items-center justify-center text-alabaster/70 transition-colors duration-500 hover:text-alabaster"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-x-3 inset-y-0 sm:inset-x-10 lg:inset-x-24"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE_LUXE }}
              drag={count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={SIZES}
                draggable={false}
                className="select-none object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 px-3 py-4 sm:px-8 sm:py-6">
          {count > 1 ? <StepButton direction="previous" onClick={() => show(index - 1)} /> : null}
          <p
            aria-live="polite"
            className="min-h-7 flex-1 text-center font-serif text-lg italic text-alabaster/80 sm:text-xl"
          >
            {image.caption}
          </p>
          {count > 1 ? <StepButton direction="next" onClick={() => show(index + 1)} /> : null}
        </div>
      </motion.div>
    </dialog>
  );
}

function StepButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const previous = direction === "previous";
  const Icon = previous ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={previous ? "Previous photograph" : "Next photograph"}
      className="flex size-12 shrink-0 items-center justify-center border border-alabaster/15 text-alabaster/70 transition-colors duration-500 hover:border-alabaster/60 hover:text-alabaster"
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.25} />
    </button>
  );
}
