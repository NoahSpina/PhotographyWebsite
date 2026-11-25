import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoryGallery } from "@/components/journal/StoryGallery";
import { buttonClass } from "@/components/ui/button-styles";
import { CATEGORY_OFFERING, getNextStory, getStory, journalStories } from "@/data/journal";
import { formatLongDate } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

type StoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return journalStories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return { title: "Journal" };

  return {
    title: story.title,
    description: story.excerpt,
    openGraph: {
      title: story.title,
      description: story.excerpt,
      images: [story.coverImage.src],
    },
  };
}

export default function JournalStoryPage({ params }: StoryPageProps) {
  return (
    <Suspense fallback={<div data-hero-overlay className="-mt-16 h-[78svh] min-h-[30rem] bg-charcoal lg:-mt-20" />}>
      <Story params={params} />
    </Suspense>
  );
}

async function Story({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const next = getNextStory(story.slug);
  const offering = CATEGORY_OFFERING[story.category];
  const opening = story.storyParagraphs.slice(0, 2);
  const closing = story.storyParagraphs.slice(2);

  return (
    <article>
      <header
        data-hero-overlay
        className="relative z-0 -mt-16 flex h-[78svh] min-h-[30rem] items-end lg:-mt-20"
      >
        <Image
          src={story.coverImage.src}
          alt={story.coverImage.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/15 to-charcoal/35" />
        <div className="relative container-page pb-10 text-alabaster sm:pb-14">
          <Link href="/journal" className="eyebrow cursor-pointer text-alabaster/80">
            <span className="underline-draw">The Journal</span>
          </Link>
          <p className="eyebrow mt-8 text-alabaster/70">{story.category}</p>
          <h1 className="mt-4 max-w-4xl font-serif text-[clamp(2.6rem,6vw,5.25rem)] font-light leading-[0.95] tracking-[-0.03em] text-balance">
            {story.title}
          </h1>
          <p className="mt-5 text-sm text-alabaster/80">{story.location}</p>
        </div>
      </header>

      <div className="container-page grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
        <aside className="lg:sticky lg:top-28 lg:col-span-3 lg:self-start">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-1">
            <Meta label="Date" value={formatLongDate(story.date)} />
            <Meta label="Location" value={story.location} />
            <Meta label="Category" value={story.category} />
            <Meta label="Reading time" value={story.readTime} />
          </dl>
        </aside>

        <div className="lg:col-span-7 lg:col-start-5">
          <div className="space-y-6 text-[1.0625rem] leading-[1.8] text-ink/90">
            {opening.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <blockquote className="my-12 border-l border-clay pl-6 font-serif text-[1.85rem] font-light leading-snug italic sm:text-[2.15rem]">
            {story.pullQuote}
          </blockquote>
          <div className="space-y-6 text-[1.0625rem] leading-[1.8] text-ink/90">
            {closing.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      <StoryGallery images={story.galleryImages} title={story.title} />

      <div className="container-page">
        <Link
          href={`/journal/${next.slug}`}
          className="group grid cursor-pointer gap-6 border-t border-hairline py-12 sm:grid-cols-[11rem_1fr] sm:items-center lg:py-16"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-linen">
            <Image
              src={next.coverImage.src}
              alt=""
              fill
              sizes="11rem"
              className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
            />
          </div>
          <div>
            <p className="eyebrow text-stone">Next Story</p>
            <p className="mt-3 max-w-xl font-serif text-3xl font-light leading-tight tracking-[-0.02em] sm:text-4xl">
              <span className="underline-draw">{next.title}</span>
            </p>
            <p className="mt-3 text-sm text-stone">{next.location}</p>
          </div>
        </Link>
      </div>

      <section className="bg-charcoal text-alabaster">
        <div className="container-page flex flex-col items-start justify-between gap-8 py-16 sm:flex-row sm:items-end lg:py-24">
          <div>
            <p className="eyebrow text-alabaster/50">Book a Similar Event</p>
            <h2 className="mt-4 max-w-xl font-serif text-[clamp(2.5rem,5vw,4.25rem)] font-light leading-[0.95] tracking-[-0.03em]">
              Let&apos;s tell the next one together.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-alabaster/70">
              {siteConfig.contact.responseTime}
            </p>
          </div>
          <Link
            href={`/book?offering=${offering}`}
            className={buttonClass({ variant: "light", size: "lg" })}
          >
            Book a Session
          </Link>
        </div>
      </section>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-stone">{label}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}
