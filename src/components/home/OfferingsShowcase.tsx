"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { useId, useState } from "react";
import { useMotionDialog } from "@/components/ui/use-motion-dialog";
import { Reveal } from "@/components/ui/Reveal";
import { buttonClass } from "@/components/ui/button-styles";
import type { CollectionTier } from "@/lib/catalog/types";
import { formatDollars } from "@/lib/format";
import { EASE_LUXE } from "@/lib/motion";
import { siteConfig, type Offering, type OfferingSlug } from "@/lib/site-config";

const CARD_LAYOUT = [
  { item: "md:col-span-7", card: "md:min-h-[40rem]" },
  { item: "md:col-span-5 md:mt-20", card: "md:min-h-[32rem]" },
  { item: "md:col-span-5", card: "md:min-h-[34rem]" },
  { item: "md:col-span-7 md:-mt-12", card: "md:min-h-[40rem]" },
] as const;

type OfferingsShowcaseProps = {
  collections: CollectionTier[];
};

export function OfferingsShowcase({ collections }: OfferingsShowcaseProps) {
  const [activeSlug, setActiveSlug] = useState<OfferingSlug | null>(null);
  const active = siteConfig.offerings.find((offering) => offering.slug === activeSlug) ?? null;

  return (
    <section id="offerings" className="border-t border-hairline bg-alabaster py-24 lg:py-32">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-stone">The Studio</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="font-serif text-[clamp(2.75rem,6vw,4.75rem)] font-light leading-[0.95] tracking-[-0.03em] lg:col-span-7">
              What We Offer
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-stone lg:col-span-4 lg:col-start-9">
              Weddings, portraits, private events, and editorial commissions, photographed with the same
              quiet attention. Open any experience to see what is included.
            </p>
          </div>
        </Reveal>

        <ul className="mt-14 grid grid-cols-1 gap-5 md:mt-16 md:grid-cols-12 md:gap-6">
          {siteConfig.offerings.map((offering, index) => {
            const layout = CARD_LAYOUT[index] ?? { item: "md:col-span-6", card: "md:min-h-[32rem]" };
            return (
            <li key={offering.slug} className={layout.item}>
              <button
                type="button"
                onClick={() => setActiveSlug(offering.slug)}
                className={`group relative block min-h-[28rem] w-full overflow-hidden text-left focus-visible:outline-offset-[-4px] ${layout.card}`}
              >
                <Image
                  src={offering.coverImage.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105 group-focus-visible:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-charcoal/10" />
                <span className="absolute inset-x-0 bottom-0 p-6 text-left text-alabaster sm:p-8">
                  <span className="eyebrow text-alabaster/75">From {formatDollars(offering.startingAt)}</span>
                  <span className="mt-3 block font-serif text-[2.4rem] font-light leading-none tracking-[-0.02em] sm:text-5xl">
                    {offering.title}
                  </span>
                  <span className="mt-3 block max-w-sm text-sm leading-relaxed text-alabaster/80">
                    {offering.tagline}
                  </span>
                  <span className="eyebrow mt-6 inline-flex items-center gap-3 text-alabaster">
                    Explore Offering
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-700 ease-luxe group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5"
                      strokeWidth={1.25}
                    />
                  </span>
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence>
        {active ? (
          <OfferingDrawer
            key={active.slug}
            offering={active}
            collections={collections}
            onClose={() => setActiveSlug(null)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function OfferingDrawer({
  offering,
  collections,
  onClose,
}: {
  offering: Offering;
  collections: CollectionTier[];
  onClose: () => void;
}) {
  const { dialogRef, dialogProps } = useMotionDialog(onClose);
  const titleId = useId();

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-transparent"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-charcoal/45"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_LUXE }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-alabaster text-ink shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.7, ease: EASE_LUXE }}
      >
        <div className="relative h-52 shrink-0 sm:h-64">
          <Image
            src={offering.coverImage.src}
            alt={offering.coverImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, 36rem"
            className="object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close offering details"
            className="absolute top-3 right-3 flex size-11 items-center justify-center bg-alabaster/90 text-ink"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-8">
          <p className="eyebrow text-stone">From {formatDollars(offering.startingAt)}</p>
          <h2
            id={titleId}
            className="mt-3 font-serif text-4xl font-light leading-none tracking-[-0.03em] sm:text-5xl"
          >
            {offering.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone">{offering.tagline}</p>

          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink/90">
            {offering.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <h3 className="mt-10 font-serif text-2xl font-light">{"What's included"}</h3>
          <ul className="mt-4 space-y-3">
            {offering.included.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-clay" />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="mt-10 font-serif text-2xl font-light">A glimpse</h3>
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {offering.previewImages.map((image) => (
              <li key={image.src} className="relative aspect-[3/4] overflow-hidden bg-linen">
                <Image src={image.src} alt={image.alt} fill sizes="10rem" className="object-cover" />
              </li>
            ))}
          </ul>

          {collections.length > 0 ? (
            <div className="mt-10">
              <h3 className="font-serif text-2xl font-light">Starting collections</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                Finished photographs are delivered through these collections. Session investment is
                confirmed when you book.
              </p>
              <ul className="mt-4">
                {collections.map((tier) => (
                  <li key={tier.id} className="border-t border-hairline py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-serif text-xl font-light">{tier.name}</p>
                      <p className="text-sm text-ink">{tier.price}</p>
                    </div>
                    {tier.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-stone">{tier.description}</p>
                    ) : null}
                    {tier.highlights.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {tier.highlights.map((item) => (
                          <li key={item} className="text-sm text-stone">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-hairline px-6 py-5 sm:px-8">
          <Link
            href={`/book?offering=${offering.slug}`}
            onClick={onClose}
            className={buttonClass({ size: "lg", className: "w-full" })}
          >
            Book This Experience
          </Link>
        </div>
      </motion.div>
    </dialog>
  );
}
