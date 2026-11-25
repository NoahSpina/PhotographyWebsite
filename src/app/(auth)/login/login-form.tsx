"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { destinationAfterSignIn, safeInternalPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";

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

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase">Studio</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Studio accounts use a password. Clients can use a password or a one-time
        email link.
      </p>

      <form onSubmit={handlePasswordSignIn} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm text-neutral-700 dark:text-neutral-300">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending === "password" ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={busy}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-neutral-700"
        >
          {pending === "magic" ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
    </main>
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
