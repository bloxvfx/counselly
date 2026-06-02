import { redirect } from "next/navigation";
import Link from "next/link";
import { getOnboardingStatus } from "@/lib/supabase/cached";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = {
  title: "Set up your profile — Counselly",
  description: "Tell us about yourself so Counselly can personalise your college counselling.",
};

export default async function OnboardingPage() {
  const { user, onboardingCompleted } = await getOnboardingStatus();

  if (onboardingCompleted) redirect("/dashboard");

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

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center sm:h-16">
          <Link href="/" className={`flex items-center ${counsellyLogoLockupClass} group`}>
            <CounsellyMark className="h-6 transition-opacity group-hover:opacity-75 sm:h-7" decorative />
            <CounsellyText className="h-[13px] w-auto transition-opacity group-hover:opacity-75 sm:h-[15px]" />
          </Link>
        </header>

        {/* Centered onboarding form */}
        <div className="flex flex-1 items-start justify-center py-6 sm:items-center sm:py-12">
          <OnboardingFlow initialName={initialName} />
        </div>

        {/* Footer note */}
        <footer className="shrink-0 py-4 text-center sm:py-6">
          <p className="type-caption text-muted-soft">
            Your data is private and never shared. You can update your profile anytime.
          </p>
        </footer>
      </div>
    </main>
  );
}
