import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { FooterAccountFallback, FooterAccountLink } from "@/components/layout/site-account";
import { Wordmark } from "@/components/layout/Wordmark";
import { buttonClass } from "@/components/ui/button-styles";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const { contact, location, nav, social } = siteConfig;

  return (
    <footer className="bg-charcoal text-alabaster">
      <div className="container-page">
        <div className="grid gap-12 border-b border-alabaster/10 py-24 lg:grid-cols-12 lg:items-end lg:py-32">
          <Reveal className="lg:col-span-8">
            <p className="eyebrow text-alabaster/50">Inquiries</p>
            <h2 className="mt-8 text-[clamp(3.25rem,9vw,8rem)] font-light leading-[0.92] tracking-[-0.025em]">
              Let&apos;s Tell
              <br />
              <em className="font-light text-alabaster/60">Your Story</em>
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-4" delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-alabaster/70">
              We take on a limited number of weddings and commissions each season.{" "}
              {contact.responseTime}
            </p>
            <div className="mt-10 flex flex-col items-start gap-6">
              <Link href="/book" className={buttonClass({ variant: "light", size: "lg" })}>
                Book a Session
              </Link>
              <a
                href={`mailto:${contact.email}`}
                className="group cursor-pointer font-serif text-2xl italic text-alabaster/90"
              >
                <span className="underline-draw">{contact.email}</span>
              </a>
            </div>
          </Reveal>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:py-20">
          <div className="sm:col-span-2 lg:col-span-5">
            <Wordmark className="text-alabaster" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-alabaster/60">
              {siteConfig.tagline}. {location.note}
            </p>
            <p className="eyebrow mt-8 text-alabaster/40">{location.base}</p>
          </div>

          <FooterColumn title="Explore" className="lg:col-span-2 lg:col-start-7">
            {nav.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Studio" className="lg:col-span-2">
            <FooterLink href="/book">Book a Session</FooterLink>
            <Suspense fallback={<FooterAccountFallback />}>
              <FooterAccountLink />
            </Suspense>
            <li>
              <a
                href={contact.phoneHref}
                className="cursor-pointer text-alabaster/70 transition-colors duration-500 hover:text-alabaster"
              >
                {contact.phone}
              </a>
            </li>
          </FooterColumn>

          <FooterColumn title="Follow" className="lg:col-span-2">
            {social.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex cursor-pointer items-center gap-1.5 text-alabaster/70 transition-colors duration-500 hover:text-alabaster"
                >
                  {link.label}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-500 ease-luxe group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.25}
                  />
                </a>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-3 border-t border-alabaster/10 py-8 text-xs text-alabaster/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.name}. All rights reserved.
          </p>
          <p className="eyebrow">{location.short}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="eyebrow text-alabaster/40">{title}</p>
      <ul className="mt-6 space-y-3 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="cursor-pointer text-alabaster/70 transition-colors duration-500 hover:text-alabaster"
      >
        {children}
      </Link>
    </li>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
