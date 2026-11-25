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
    <div className="min-h-full">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <p className="text-sm font-medium tracking-wide">Studio</p>
        </div>
      </header>
    </div>
  );
}
