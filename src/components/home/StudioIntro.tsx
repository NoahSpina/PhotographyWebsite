import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/site-config";

export function StudioIntro() {
  const { intro, location, name, philosophy } = siteConfig;

  return (
    <section id="about" className="bg-alabaster pb-20 pt-20 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
      <div className="container-page grid items-center gap-16 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-6">
          <p className="eyebrow text-stone">{location.eyebrow}</p>
          <h1 className="mt-6 max-w-xl font-serif text-[clamp(3.5rem,8vw,6.75rem)] font-light leading-[0.9] tracking-[-0.035em] text-balance">
            {name}
          </h1>
          <p className="mt-8 max-w-xl font-serif text-2xl font-light leading-snug text-ink sm:text-[1.75rem]">
            {intro.lead}
          </p>
          <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-relaxed text-stone">
            {intro.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-8 font-serif text-xl italic text-ink">{intro.signature}</p>
        </Reveal>

        <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.12}>
          <div className="relative pb-16 sm:pb-20">
            <figure className="ml-auto w-[84%] sm:w-[80%]">
              <div className="relative aspect-[4/5] overflow-hidden bg-linen">
                <Image
                  src={intro.portrait.src}
                  alt={intro.portrait.alt}
                  fill
                  sizes="(max-width: 1024px) 70vw, 34vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 text-right">
                <span className="eyebrow text-stone">{intro.portraitCaption}</span>
              </figcaption>
            </figure>
            <figure className="absolute bottom-0 left-0 w-[42%] border-4 border-alabaster bg-linen sm:w-[38%]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={intro.detail.src}
                  alt={intro.detail.alt}
                  fill
                  sizes="(max-width: 1024px) 40vw, 16vw"
                  className="object-cover"
                />
              </div>
            </figure>
          </div>
        </Reveal>
      </div>

      <div className="container-page mt-20 sm:mt-28">
        <div className="grid border-t border-hairline sm:grid-cols-3">
          {philosophy.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <div
                className={`border-hairline py-8 sm:px-8 sm:py-10 ${
                  index === 0 ? "sm:pl-0" : "border-t sm:border-t-0 sm:border-l"
                }`}
              >
                <h2 className="font-serif text-[1.75rem] font-light leading-tight">{item.title}</h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
