import Link from "next/link";
import { signOut } from "@/lib/auth/sign-out";
import { getSiteViewer, type SiteViewer } from "@/lib/auth/viewer";
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
    <div className="hidden items-center gap-5 md:flex">
      <p className="nav-tone-muted eyebrow max-w-48 truncate">
        Hello, <span className="nav-tone">{viewer.name}</span>
      </p>
      <Link href={next.href} className="nav-tone-muted eyebrow cursor-pointer">
        {next.label}
      </Link>
      <SignOutButton className="nav-tone-muted eyebrow" />
    </div>
  );
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
    <Link href="/login" className="nav-tone-muted eyebrow hidden cursor-pointer md:inline">
      Client Login
    </Link>
  );
}

function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
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
