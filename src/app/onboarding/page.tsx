import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CounsellyMark } from "@/components/brand/counselly-mark";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = {
  title: "Set up your profile — Counselly",
  description: "Tell us about yourself so Counselly can personalise your college counselling.",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Check counselly_profiles — the canonical Counselly onboarding table
  const { data: profile } = await supabase
    .from("counselly_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/dashboard");

  // Pre-populate name from Lerno auth metadata
  const initialName: string =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";

  return (
    <main className="min-h-screen bg-canvas">
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(45,127,193,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        {/* Header */}
        <header className="flex h-14 items-center">
          <Link href="/" className="flex items-center gap-1.5 group">
            <CounsellyMark className="h-6 transition-opacity group-hover:opacity-75" decorative />
            <span className="type-wordmark text-ink text-[1.45rem] transition-opacity group-hover:opacity-75">
              Counselly
            </span>
          </Link>
        </header>

        {/* Centered onboarding form */}
        <div className="flex flex-1 items-center justify-center py-12">
          <OnboardingFlow initialName={initialName} />
        </div>

        {/* Footer note */}
        <footer className="py-6 text-center">
          <p className="type-caption text-muted-soft">
            Your data is private and never shared. You can update your profile anytime.
          </p>
        </footer>
      </div>
    </main>
  );
}
