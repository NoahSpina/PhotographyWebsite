import Link from "next/link";
import { signOut } from "@/lib/auth/sign-out";
import { getSiteViewer, type SiteViewer } from "@/lib/auth/viewer";
import { NavMark, navLinkClass } from "@/components/layout/nav-link";
import { buttonClass } from "@/components/ui/button-styles";

function destination(viewer: SiteViewer): { href: string; label: string } {
  if (viewer.role === "admin") return { href: "/admin", label: "Studio" };
  return { href: "/gallery", label: "Your Gallery" };
}

export async function NavAccount() {
  const viewer = await getSiteViewer();
  if (!viewer) return <LoginLink />;

  const next = destination(viewer);
  return (
    <div data-nav-account className="hidden items-center gap-5 md:flex lg:gap-7 xl:gap-10">
      {/* Shown only at widths with room for it beside the other nav items. */}
      <p className="nav-tone-muted eyebrow hidden truncate min-[56rem]:block lg:hidden min-[90rem]:block">
        Hello, <span className="nav-tone">{firstName(viewer.name)}</span>
      </p>
      <Link href={next.href} className={`${navLinkClass} nav-tone-muted`}>
        {next.label}
        <NavMark />
      </Link>
      <SignOutButton className={`${navLinkClass} nav-tone-muted`}>
        <NavMark />
      </SignOutButton>
    </div>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

export function NavAccountFallback() {
  return <span className="eyebrow hidden w-40 md:inline" aria-hidden="true" />;
}

export async function MenuAccount() {
  const viewer = await getSiteViewer();
  if (!viewer) {
    return (
      <Link
        href="/login"
        className={buttonClass({ variant: "outline", size: "lg", className: "w-full" })}
      >
        Client Login
      </Link>
    );
  }

  const next = destination(viewer);
  return (
    <div className="space-y-3">
      <p className="font-serif text-3xl font-light tracking-[-0.02em]">
        Hello, {viewer.name}
      </p>
      <Link href={next.href} className={buttonClass({ size: "lg", className: "w-full" })}>
        {next.label}
      </Link>
      <SignOutButton className={buttonClass({ variant: "outline", size: "lg", className: "w-full" })} />
    </div>
  );
}

export function MenuAccountFallback() {
  return <span className="block h-14" aria-hidden="true" />;
}

export async function FooterAccountLink() {
  const viewer = await getSiteViewer();
  if (!viewer) return <FooterLoginLink href="/login">Client Login</FooterLoginLink>;
  const next = destination(viewer);
  return <FooterLoginLink href={next.href}>{next.label}</FooterLoginLink>;
}

export function FooterAccountFallback() {
  return (
    <li aria-hidden="true">
      <span className="text-transparent">Client Login</span>
    </li>
  );
}

function LoginLink() {
  return (
    <Link href="/login" className={`${navLinkClass} nav-tone-muted hidden md:block`}>
      Client Login
      <NavMark />
    </Link>
  );
}

function SignOutButton({ className, children }: { className: string; children?: React.ReactNode }) {
  return (
    <form action={signOut} className="flex">
      <button type="submit" className={className}>
        Sign out
        {children}
      </button>
    </form>
  );
}

function FooterLoginLink({ href, children }: { href: string; children: React.ReactNode }) {
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
