import Image from "next/image";
import Link from "next/link";
import type { JournalStory } from "@/data/journal";
import { formatLongDate } from "@/lib/format";

type JournalCardProps = {
  story: JournalStory;
  featured?: boolean;
};

export function JournalCard({ story, featured = false }: JournalCardProps) {
  return (
    <Link
      href={`/journal/${story.slug}`}
      className={`group cursor-pointer ${featured ? "grid items-center gap-8 lg:grid-cols-12 lg:gap-12" : "block"}`}
    >
      <div
        className={`relative overflow-hidden bg-linen ${
          featured ? "aspect-[16/10] lg:col-span-7" : "aspect-[4/5]"
        }`}
      >
        <Image
          src={story.coverImage.src}
          alt={story.coverImage.alt}
          fill
          sizes={featured ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 30vw"}
          className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105 group-focus-visible:scale-105"
        />
      </div>
      <div className={featured ? "lg:col-span-5" : "mt-5"}>
        <p className="eyebrow text-stone">
          {story.category}
          <span aria-hidden="true"> · </span>
          {formatLongDate(story.date)}
        </p>
        <h3
          className={`mt-3 font-serif font-light leading-[1.05] tracking-[-0.02em] text-balance ${
            featured ? "text-[clamp(2rem,4vw,3.25rem)]" : "text-[1.65rem]"
          }`}
        >
          <span className="underline-draw">{story.title}</span>
        </h3>
        <p className={`mt-4 text-sm leading-relaxed text-stone ${featured ? "max-w-md" : "line-clamp-3"}`}>
          {story.excerpt}
        </p>
        <p className="mt-5 text-sm text-ink">{story.location}</p>
      </div>
    </Link>
  );
}
