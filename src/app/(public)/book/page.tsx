import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button-styles";
import { Reveal } from "@/components/ui/Reveal";
import { formatDollars, padIndex } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Book a Session",
  description: siteConfig.booking.lead,
};

type BookPageProps = {
  searchParams: Promise<{ offering?: string | string[] }>;
};

export default function BookPage({ searchParams }: BookPageProps) {
  return (
    <Suspense fallback={<div className="container-page min-h-[70vh] py-24" />}>
      <BookContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BookContent({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.offering) ? params.offering[0] : params.offering;
  const offering = siteConfig.offerings.find((item) => item.slug === requested);
  const { booking, contact, location } = siteConfig;
  const subject = offering ? `Booking inquiry: ${offering.title}` : "Booking inquiry";
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <article className="pb-24 pt-14 lg:pt-20">
      <div className="container-page grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-6">
          <p className="eyebrow text-stone">{location.eyebrow}</p>
          <h1 className="mt-5 max-w-xl font-serif text-[clamp(3.25rem,7vw,6rem)] font-light leading-[0.92] tracking-[-0.035em] text-balance">
            Book a Session
          </h1>
          {offering ? (
            <p className="eyebrow mt-6 text-clay">
              {offering.title} · from {formatDollars(offering.startingAt)}
            </p>
          ) : null}
          <p className="mt-8 max-w-xl font-serif text-2xl font-light leading-snug text-ink">{booking.lead}</p>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-stone">{booking.body}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={mailto} className={buttonClass({ size: "lg" })}>
              Write to the Studio
            </a>
            <a href={contact.phoneHref} className={buttonClass({ variant: "outline", size: "lg" })}>
              {contact.phone}
            </a>
          </div>
          <p className="mt-6 text-sm text-stone">{contact.responseTime}</p>
        </Reveal>

        <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.1}>
          <figure>
            <div className="relative aspect-[4/5] overflow-hidden bg-linen">
              <Image
                src={booking.image.src}
                alt={booking.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-4">
              <span className="eyebrow text-stone">{booking.imageCaption}</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>

      <ol className="container-page mt-20 grid border-t border-hairline sm:mt-28 sm:grid-cols-3">
        {booking.steps.map((step, index) => (
          <li
            key={step.title}
            className={`border-hairline py-8 sm:px-8 sm:py-10 ${
              index === 0 ? "sm:pl-0" : "border-t sm:border-t-0 sm:border-l"
            }`}
          >
            <p className="eyebrow text-stone">{padIndex(index + 1)}</p>
            <h2 className="mt-4 font-serif text-[1.75rem] font-light">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone">{step.description}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
