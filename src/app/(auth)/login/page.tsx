import { Suspense } from "react";
import { loginErrorMessage, safeInternalPath } from "@/lib/auth/paths";
import { LoginForm } from "./login-form";

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
        <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        </main>
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
