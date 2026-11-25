import Link from "next/link";
import { JournalCard } from "@/components/journal/JournalCard";
import { Reveal } from "@/components/ui/Reveal";
import { journalStories } from "@/data/journal";

export function JournalSection() {
  const [lead, ...rest] = journalStories;
  if (!lead) return null;

  return (
    <section className="bg-linen py-24 lg:py-32">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-stone">The Journal</p>
              <h2 className="mt-4 font-serif text-[clamp(2.75rem,6vw,4.75rem)] font-light leading-[0.95] tracking-[-0.03em]">
                Recent Stories
              </h2>
            </div>
            <Link href="/journal" className="eyebrow cursor-pointer text-ink">
              <span className="underline-draw">All Stories</span>
            </Link>
          </div>
        </Reveal>

        <Reveal className="mt-14 lg:mt-16">
          <JournalCard story={lead} featured />
        </Reveal>

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {rest.map((story, index) => (
            <Reveal key={story.slug} delay={index * 0.08}>
              <JournalCard story={story} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
