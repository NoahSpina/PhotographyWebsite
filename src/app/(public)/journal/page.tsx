import type { Metadata } from "next";
import { JournalIndex } from "@/components/journal/JournalIndex";
import { journalStories } from "@/data/journal";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "The Journal",
  description: `Recent weddings, portraits, and events photographed by ${siteConfig.name}.`,
};

export default function JournalPage() {
  return (
    <div className="pb-24 pt-12 lg:pt-16">
      <header className="container-page">
        <p className="eyebrow text-stone">The Journal</p>
        <h1 className="mt-4 max-w-3xl font-serif text-[clamp(3.25rem,8vw,6.5rem)] font-light leading-[0.92] tracking-[-0.035em] text-balance">
          Recent Stories
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-stone sm:text-base">
          Notes from the weddings, portraits, and evenings we were invited to photograph across New
          Jersey and farther afield.
        </p>
      </header>
      <JournalIndex stories={journalStories} />
    </div>
  );
}
