import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Wordmark } from "@/components/layout/Wordmark";
import { buttonClass } from "@/components/ui/button-styles";
import { signOut } from "./actions";
import { AdminNav } from "./admin-nav";
import { createClient } from "@/lib/supabase/server";

export async function AdminFrame({ children }: { children: React.ReactNode }) {
  // Supabase checks token expiry with Date.now(), which must not run during prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    redirect("/login?next=/admin");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin layout could not read the profile:", error.message);
  }

  if (error || profile?.role !== "admin") {
    redirect("/login?error=forbidden&next=/admin");
  }

  const label = profile.full_name?.trim() || profile.email || "Admin";

  return (
    <div className="min-h-full bg-alabaster text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Wordmark />
            <AdminNav />
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-stone sm:block">{label}</p>
            <form action={signOut}>
              <button type="submit" className={buttonClass({ variant: "outline", size: "sm" })}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10">{children}</div>
    </div>
  );
}
