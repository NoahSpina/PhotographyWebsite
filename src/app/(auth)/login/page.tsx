import type { Metadata } from "next";
import { Suspense } from "react";
import { loginErrorMessage, safeInternalPath } from "@/lib/auth/paths";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
          <div className="min-h-56 bg-charcoal lg:min-h-dvh" />
          <main className="flex flex-col justify-center bg-alabaster px-6 py-16">
            <h1 className="font-serif text-5xl font-light">Sign in</h1>
          </main>
        </div>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeInternalPath(firstParam(params.next));
  const initialError = loginErrorMessage(firstParam(params.error));

  return <LoginForm next={next} initialError={initialError} />;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
