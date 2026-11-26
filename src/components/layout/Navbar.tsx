"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Suspense, useState, useSyncExternalStore } from "react";
import { NavMark, navLinkClass } from "@/components/layout/nav-link";
import { Wordmark } from "@/components/layout/Wordmark";
import { buttonClass } from "@/components/ui/button-styles";
import { useMotionDialog } from "@/components/ui/use-motion-dialog";
import { padIndex } from "@/lib/format";
import { EASE_LUXE } from "@/lib/motion";
import { siteConfig } from "@/lib/site-config";

const SCROLLED_AFTER_PX = 16;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > SCROLLED_AFTER_PX;
const isScrolledOnServer = () => false;

export function Navbar({
  account,
  menuAccount,
}: {
  account: React.ReactNode;
  menuAccount: React.ReactNode;
}) {
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, isScrolledOnServer);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      data-nav
      data-scrolled={scrolled ? "true" : "false"}
      className="sticky top-0 z-40 border-b border-transparent bg-transparent transition-[background-color,border-color,backdrop-filter] duration-700 ease-luxe"
    >
      <a
        href="#main-content"
        className="eyebrow sr-only bg-espresso px-4 py-3 text-alabaster focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      <nav
        aria-label="Primary"
        className="container-page grid h-16 grid-cols-[1fr_auto] items-center gap-6 lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-7 xl:gap-10"
      >
        <Wordmark className="nav-tone justify-self-start" />

        <Suspense fallback={<DesktopLinks pathname={null} />}>
          <DesktopLinksForCurrentPath />
        </Suspense>

        <div className="flex items-center gap-3 justify-self-end sm:gap-7">
          {account}
          <Link href="/book" className={buttonClass({ size: "sm", className: "nav-cta" })}>
            <span className="nav-cta-short sm:hidden">Book</span>
            <span className="nav-cta-long hidden sm:inline">Book a Session</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="nav-tone -mr-2 flex size-11 items-center justify-center lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.25} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen ? (
          <MobileMenu key="mobile-menu" account={menuAccount} onClose={() => setMenuOpen(false)} />
        ) : null}
      </AnimatePresence>
    </header>
  );
}

/** Kept behind Suspense: the pathname is unknown while prerendering unlisted dynamic routes. */
function DesktopLinksForCurrentPath() {
  const pathname = usePathname();
  return <DesktopLinks pathname={pathname} />;
}

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="hidden items-center gap-7 lg:flex xl:gap-10">
      {siteConfig.nav.map((link) => {
        const active = isActivePath(link.href, pathname);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`${navLinkClass} block ${active ? "nav-tone" : "nav-tone-muted"}`}
            >
              {link.label}
              <NavMark active={active} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function isActivePath(href: string, pathname: string | null): boolean {
  if (!pathname || href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileMenu({
  account,
  onClose,
}: {
  account: React.ReactNode;
  onClose: () => void;
}) {
  const { dialogRef, dialogProps } = useMotionDialog(onClose);
  const { contact, location } = siteConfig;

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      aria-label="Site menu"
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <motion.div
        className="flex h-full flex-col bg-alabaster"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
      >
        <div className="container-page flex h-16 shrink-0 items-center justify-between border-b border-hairline">
          <Wordmark onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 flex size-11 items-center justify-center"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        <nav
          aria-label="Mobile"
          className="container-page flex flex-1 flex-col justify-between gap-12 overflow-y-auto pb-10 pt-6"
        >
          <ul>
            {siteConfig.nav.map((link, index) => (
              <motion.li
                key={link.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE_LUXE, delay: 0.12 + index * 0.06 }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="flex cursor-pointer items-baseline justify-between border-b border-hairline py-5 font-serif text-[2.5rem] font-light leading-none"
                >
                  {link.label}
                  <span className="eyebrow text-stone">{padIndex(index + 1)}</span>
                </Link>
              </motion.li>
            ))}
          </ul>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE_LUXE, delay: 0.4 }}
          >
            <div
              onClick={(event) => {
                const target = event.target;
                if (target instanceof Element && target.closest("a")) onClose();
              }}
            >
              {account}
            </div>
            <Link href="/book" onClick={onClose} className={buttonClass({ size: "lg", className: "w-full" })}>
              Book a Session
            </Link>
            <p className="pt-5 text-sm text-stone">
              {location.short} ·{" "}
              <a href={`mailto:${contact.email}`} className="cursor-pointer text-ink">
                {contact.email}
              </a>
            </p>
          </motion.div>
        </nav>
      </motion.div>
    </dialog>
  );
}
