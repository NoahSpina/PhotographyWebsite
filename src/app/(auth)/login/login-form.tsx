"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/layout/Wordmark";
import { buttonClass } from "@/components/ui/button-styles";
import { destinationAfterSignIn, safeInternalPath } from "@/lib/auth/paths";
import { siteConfig } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "mt-3 w-full border border-hairline bg-transparent px-4 py-3 text-sm text-ink outline-none transition-colors duration-500 focus:border-espresso";

type LoginFormProps = {
  next: string | null;
  initialError: string | null;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "magic" | null>(null);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending("password");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setPending(null);
      setError(signInError.message);
      return;
    }

    const destination = await resolveDestination(next);
    router.push(destination);
    router.refresh();
  }

  async function handleMagicLink() {
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter the email address that should receive the sign-in link.");
      return;
    }

    setPending("magic");
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    const safeNext = safeInternalPath(next);
    if (safeNext) callback.searchParams.set("next", safeNext);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: callback.toString(),
        shouldCreateUser: true,
      },
    });

    setPending(null);
    if (otpError) {
      setError(otpError.message);
      return;
    }

    setNotice("Check your email for a sign-in link.");
  }

  const busy = pending !== null;

  const portrait = siteConfig.clientAccess;

  return (
    <div className="grid min-h-dvh flex-1 bg-alabaster lg:grid-cols-2">
      <div className="relative h-64 sm:h-80 lg:h-auto lg:min-h-dvh">
        <Image
          src={portrait.image.src}
          alt={portrait.image.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/20 to-charcoal/30" />
        <div className="absolute inset-x-0 bottom-0 hidden p-10 text-alabaster lg:block xl:p-14">
          <p className="eyebrow text-alabaster/70">{portrait.eyebrow}</p>
          <p className="mt-6 max-w-md font-serif text-4xl font-light italic leading-tight">
            {portrait.quote}
          </p>
        </div>
      </div>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <Wordmark />
        <p className="eyebrow mt-10 text-stone">Client & studio access</p>
        <h1 className="mt-4 font-serif text-5xl font-light leading-none tracking-[-0.03em] sm:text-6xl">
          Sign in
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone">
          Studio accounts use a password. Clients can use a password or a one-time email link.
        </p>

        <form onSubmit={handlePasswordSignIn} className="mt-10 max-w-md space-y-6">
          <label className="block">
            <span className="eyebrow text-stone">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="eyebrow text-stone">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="border-l border-clay pl-4 text-sm text-ink">
              {notice}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className={buttonClass({ size: "lg", className: "w-full" })}
            >
              {pending === "password" ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={busy}
              className={buttonClass({ variant: "outline", size: "lg", className: "w-full" })}
            >
              {pending === "magic" ? "Sending link…" : "Email me a sign-in link"}
            </button>
          </div>
        </form>

        <p className="mt-10 text-sm text-stone">
          <Link href="/" className="cursor-pointer text-ink">
            <span className="underline-draw">Return to the studio</span>
          </Link>
        </p>
      </main>
    </div>
  );
}

async function resolveDestination(next: string | null) {
  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  let albumId: string | null = null;
  if (profile?.role !== "admin") {
    const { data: album } = await supabase
      .from("albums")
      .select("id")
      .eq("client_id", userId)
      .eq("status", "published")
      .order("shoot_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    albumId = album?.id ?? null;
  }

  return destinationAfterSignIn({
    role: profile?.role ?? null,
    albumId,
    next,
  });
}
