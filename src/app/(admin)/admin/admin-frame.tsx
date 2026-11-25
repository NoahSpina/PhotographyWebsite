import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { AdminNav } from "./admin-nav";
import { createClient } from "@/lib/supabase/server";

export async function AdminFrame({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-full">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-8">
            <p className="text-sm font-medium tracking-wide">Studio</p>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-neutral-500 sm:block">{label}</p>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
