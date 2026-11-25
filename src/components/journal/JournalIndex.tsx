"use client";

import { useState } from "react";
import { JournalCard } from "@/components/journal/JournalCard";
import { JOURNAL_CATEGORIES, type JournalCategory, type JournalStory } from "@/data/journal";

const FILTERS = ["All", ...JOURNAL_CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

export function JournalIndex({ stories }: { stories: JournalStory[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const visible =
    filter === "All" ? stories : stories.filter((story) => story.category === (filter as JournalCategory));
  const [lead, ...rest] = visible;
  const showLead = filter === "All" && lead;

  return (
    <div className="container-page mt-12">
      <div role="group" aria-label="Filter stories" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = item === filter;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item)}
              className={`eyebrow border px-4 py-2.5 transition-colors duration-500 ${
                active
                  ? "border-espresso bg-espresso text-alabaster"
                  : "border-hairline bg-transparent text-stone hover:border-espresso hover:text-ink"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-16 text-sm text-stone">No stories in this chapter yet.</p>
      ) : null}

      {showLead ? (
        <>
          <div className="mt-14">
            <JournalCard story={lead} featured />
          </div>
          {rest.length > 0 ? (
            <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
              {rest.map((story) => (
                <JournalCard key={story.slug} story={story} />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((story) => (
            <JournalCard key={story.slug} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
