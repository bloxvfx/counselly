"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormData {
  fullName: string;
  grade: string;
  targetCountries: string[];
  intendedMajor: string;
  testPlans: Record<string, boolean>;
  applicationCycle: string;
}

const GRADE_OPTIONS = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "gap_year", label: "Gap year" },
  { value: "applied", label: "Already applied" },
];

const COUNTRY_OPTIONS = [
  "USA", "UK", "Canada", "Australia", "Singapore", "Europe", "India", "Other",
];

const MAJOR_OPTIONS = [
  "Engineering & Computer Science",
  "Business & Economics",
  "Sciences",
  "Arts & Humanities",
  "Medicine & Healthcare",
  "Law",
  "Social Sciences",
  "Undecided",
];

const TEST_OPTIONS = [
  { key: "sat", label: "SAT" },
  { key: "act", label: "ACT" },
  { key: "ielts", label: "IELTS" },
  { key: "toefl", label: "TOEFL" },
];

const CYCLE_OPTIONS = [
  { value: "2025-26", label: "2025–26 (this cycle)" },
  { value: "2026-27", label: "2026–27" },
  { value: "2027-28", label: "2027–28" },
  { value: "unsure", label: "Still figuring out" },
];

const TOTAL_STEPS = 3;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-pill transition-all duration-300",
            i < current
              ? "w-6 bg-primary"
              : i === current
              ? "w-8 bg-primary"
              : "w-4 bg-surface-cream-strong",
          )}
        />
      ))}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-pill border px-4 type-caption transition-all duration-150",
        active
          ? "border-primary bg-primary/8 text-primary"
          : "border-hairline bg-canvas text-muted hover:border-primary/40 hover:text-body",
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingFlow({ initialName = "" }: { initialName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FormData>({
    fullName: initialName,
    grade: "",
    targetCountries: [],
    intendedMajor: "",
    testPlans: {},
    applicationCycle: "",
  });

  function toggleCountry(c: string) {
    setData((d) => ({
      ...d,
      targetCountries: d.targetCountries.includes(c)
        ? d.targetCountries.filter((x) => x !== c)
        : [...d.targetCountries, c],
    }));
  }

  function toggleTest(key: string) {
    setData((d) => ({ ...d, testPlans: { ...d.testPlans, [key]: !d.testPlans[key] } }));
  }

  function canAdvance(): boolean {
    if (step === 0) return data.fullName.trim().length >= 2 && Boolean(data.grade);
    if (step === 1) return data.targetCountries.length > 0 && Boolean(data.intendedMajor);
    if (step === 2) return Boolean(data.applicationCycle);
    return false;
  }

  async function handleFinish() {
    setError("");
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: upsertError } = await supabase.from("sapientia_profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: data.fullName.trim(),
        grade: data.grade,
        target_countries: data.targetCountries,
        intended_major: data.intendedMajor,
        test_plans: data.testPlans,
        application_cycle: data.applicationCycle,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <StepDots current={step} />

      {/* Step 0 — About you */}
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="type-caption-upper text-muted mb-2">Step 1 of 3</p>
            <h2 className="type-display-md text-ink mb-1">Let&apos;s start with you.</h2>
            <p className="type-body-sm text-muted">Your profile helps Sapientia personalise every recommendation.</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="type-caption text-body">Your full name</span>
            <input
              type="text"
              value={data.fullName}
              onChange={(e) => setData((d) => ({ ...d, fullName: e.target.value }))}
              placeholder="Aarav Sharma"
              className="h-12 rounded-md border border-hairline bg-canvas px-4 type-body-md text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="type-caption text-body">Your current stage</span>
            <div className="grid grid-cols-2 gap-3">
              {GRADE_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, grade: g.value }))}
                  className={cn(
                    "h-12 rounded-lg border px-4 type-caption text-left transition-all duration-150",
                    data.grade === g.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-hairline bg-canvas text-muted hover:border-primary/40 hover:text-body",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Your goals */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="type-caption-upper text-muted mb-2">Step 2 of 3</p>
            <h2 className="type-display-md text-ink mb-1">Where do you want to go?</h2>
            <p className="type-body-sm text-muted">Select all the countries you&apos;re considering.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="type-caption text-body">Target countries</span>
            <div className="flex flex-wrap gap-2">
              {COUNTRY_OPTIONS.map((c) => (
                <ChipButton key={c} active={data.targetCountries.includes(c)} onClick={() => toggleCountry(c)}>
                  {c}
                </ChipButton>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="type-caption text-body">Intended field of study</span>
            <div className="grid grid-cols-2 gap-2">
              {MAJOR_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, intendedMajor: m }))}
                  className={cn(
                    "h-10 rounded-md border px-3 type-caption text-left transition-all duration-150",
                    data.intendedMajor === m
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-hairline bg-canvas text-muted hover:border-primary/40 hover:text-body",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Tests & timeline */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="type-caption-upper text-muted mb-2">Step 3 of 3</p>
            <h2 className="type-display-md text-ink mb-1">Tests & timeline.</h2>
            <p className="type-body-sm text-muted">We&apos;ll tailor your prep plan around these.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="type-caption text-body">Tests you&apos;re planning (or have taken)</span>
            <div className="flex flex-wrap gap-2">
              {TEST_OPTIONS.map((t) => (
                <ChipButton key={t.key} active={Boolean(data.testPlans[t.key])} onClick={() => toggleTest(t.key)}>
                  {t.label}
                </ChipButton>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="type-caption text-body">Application cycle</span>
            <div className="grid grid-cols-2 gap-2">
              {CYCLE_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, applicationCycle: c.value }))}
                  className={cn(
                    "h-12 rounded-md border px-3 type-caption text-left transition-all duration-150",
                    data.applicationCycle === c.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-hairline bg-canvas text-muted hover:border-primary/40 hover:text-body",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-error/40 bg-error/5 px-4 py-3 type-body-sm text-ink">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className={cn("mt-10 flex", step > 0 ? "justify-between" : "justify-end")}>
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            Back
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={!canAdvance() || pending}>
            {pending ? "Setting up…" : "Go to dashboard"}
          </Button>
        )}
      </div>
    </div>
  );
}
