import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  MenuAccount,
  MenuAccountFallback,
  NavAccount,
  NavAccountFallback,
} from "@/components/layout/site-account";
import { MotionProvider } from "@/components/ui/MotionProvider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <Navbar
        account={
          <Suspense fallback={<NavAccountFallback />}>
            <NavAccount />
          </Suspense>
        }
        menuAccount={
          <Suspense fallback={<MenuAccountFallback />}>
            <MenuAccount />
          </Suspense>
        }
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </MotionProvider>
  );
}
