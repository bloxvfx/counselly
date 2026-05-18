import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SapientiaMark } from "@/components/brand/sapientia-mark";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("sapientia_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/dashboard");

  // Pre-populate from auth metadata so Lerno users don't have to retype their name
  const initialName: string =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";

  return (
    <main className="min-h-screen bg-canvas px-6 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2">
            <SapientiaMark className="h-6" decorative />
            <span className="font-display text-[1.25rem] font-[400] tracking-tight text-ink">
              Sapientia
            </span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <OnboardingFlow initialName={initialName} />
        </div>
      </div>
    </main>
  );
}
