import { Suspense } from "react";
import { AdminFrame } from "./admin-frame";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

function AdminFallback() {
  return (
    <div className="min-h-full bg-alabaster text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl items-center px-5 py-4">
          <p className="font-serif text-2xl font-light">
            Luke <span className="italic">Studio</span>
          </p>
        </div>
      </header>
    </div>
  );
}
