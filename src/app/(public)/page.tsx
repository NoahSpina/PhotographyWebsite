import { Suspense } from "react";
import { HeroPhotoFeed } from "@/components/home/HeroPhotoFeed";
import { JournalSection } from "@/components/home/JournalSection";
import { OfferingsShowcase } from "@/components/home/OfferingsShowcase";
import { StudioIntro } from "@/components/home/StudioIntro";
import { getHeroFrames, getStudioCollections } from "@/lib/catalog/data";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroFallback />}>
        <Hero />
      </Suspense>
      <StudioIntro />
      <Suspense fallback={<OfferingsFallback />}>
        <Offerings />
      </Suspense>
      <JournalSection />
    </>
  );
}

async function Hero() {
  const frames = await getHeroFrames();
  return <HeroPhotoFeed frames={frames} />;
}

async function Offerings() {
  const collections = await getStudioCollections();
  return <OfferingsShowcase collections={collections} />;
}

function HeroFallback() {
  return <div data-hero-overlay className="-mt-16 h-svh bg-charcoal lg:-mt-20" />;
}

function OfferingsFallback() {
  return <div className="min-h-[70vh] border-t border-hairline bg-alabaster" />;
}
