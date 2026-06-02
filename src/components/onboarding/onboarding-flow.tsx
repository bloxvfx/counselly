"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface FormData {
  fullName: string;
  grade: string;
  board: string;
  targetCountries: string[];
  intendedMajor: string;
  indiaTrack: string;
  academicScore: string;
  scoreType: string;
  testsTaken: string[];
  testsPlanned: string[];
  applicationCycle: string;
  financialAidImportance: string;
  collegeTypePreference: string[];
  activities: string[];
  helpNeeded: string[];
}

/* ─── Constants ─── */
const GRADE_OPTIONS = [
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "gap_year", label: "Gap Year" },
  { value: "applied", label: "Already Applied" },
];

const PRIMARY_COUNTRY_OPTIONS = [
  { value: "USA", emoji: "🇺🇸" },
  { value: "UK", emoji: "🇬🇧" },
  { value: "Canada", emoji: "🇨🇦" },
  { value: "Australia", emoji: "🇦🇺" },
  { value: "Singapore", emoji: "🇸🇬" },
  { value: "Germany", emoji: "🇩🇪" },
  { value: "Netherlands", emoji: "🇳🇱" },
  { value: "India", emoji: "🇮🇳" },
  { value: "Other", emoji: "🌍" },
];

const EXTENDED_COUNTRY_OPTIONS = [
  { value: "Japan", emoji: "🇯🇵" },
  { value: "Hong Kong", emoji: "🇭🇰" },
  { value: "South Korea", emoji: "🇰🇷" },
  { value: "France", emoji: "🇫🇷" },
  { value: "Ireland", emoji: "🇮🇪" },
  { value: "Italy", emoji: "🇮🇹" },
  { value: "Spain", emoji: "🇪🇸" },
  { value: "Sweden", emoji: "🇸🇪" },
  { value: "Norway", emoji: "🇳🇴" },
  { value: "Denmark", emoji: "🇩🇰" },
  { value: "Belgium", emoji: "🇧🇪" },
  { value: "Austria", emoji: "🇦🇹" },
  { value: "Switzerland", emoji: "🇨🇭" },
];

const COUNTRY_OPTIONS = [
  ...PRIMARY_COUNTRY_OPTIONS.filter((c) => c.value !== "Other"),
  ...EXTENDED_COUNTRY_OPTIONS,
  PRIMARY_COUNTRY_OPTIONS[PRIMARY_COUNTRY_OPTIONS.length - 1],
];

const PRIMARY_COUNTRY_VALUES = new Set(
  PRIMARY_COUNTRY_OPTIONS.map((c) => c.value),
);

const MAJOR_OPTIONS = [
  "Engineering & CS",
  "Business & Economics",
  "Sciences",
  "Arts & Design",
  "Humanities & Social Sciences",
  "Medicine & Healthcare",
  "Law & Political Science",
  "Undecided",
];

// Shown only when India is selected AND major is ambiguous (Sciences or Undecided)
const INDIA_TRACK_OPTIONS = [
  {
    value: "jee",
    label: "JEE track",
    sub: "IITs, NITs, IIITs — entrance exam based",
  },
  {
    value: "neet",
    label: "NEET track",
    sub: "Medical colleges — NEET score based",
  },
  {
    value: "holistic",
    label: "Liberal universities",
    sub: "Ashoka, Plaksha, FLAME, Krea — profile based",
  },
  {
    value: "unsure",
    label: "Not sure yet",
    sub: "I'll figure this out later",
  },
];

const BOARD_OPTIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE_ISC", label: "ICSE / ISC" },
  { value: "IB", label: "IB Diploma" },
  { value: "Cambridge", label: "Cambridge (IGCSE/A-Levels)" },
  { value: "State Board", label: "State Board" },
  { value: "Other", label: "Other" },
];

const AID_OPTIONS = [
  { value: "critical", label: "Critical", sub: "Need significant aid" },
  { value: "helpful", label: "Helpful", sub: "Would reduce burden" },
  { value: "not_needed", label: "Not needed", sub: "Finances aren't a concern" },
];

const HELP_OPTIONS = [
  "Building my college list",
  "Writing application essays",
  "Strengthening my profile",
  "Test prep strategy",
  "Scholarship search",
  "Interview preparation",
  "Understanding deadlines",
  "Everything — I'm new to this",
];

const TOTAL_STEPS = 4;

/* ─── Animation variants ─── */
const ease = [0.21, 0.47, 0.32, 0.98] as const;

const stepVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 32 : -32,
    filter: "blur(8px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -32 : 32,
    filter: "blur(8px)",
    transition: { duration: 0.28, ease },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease, delay: i * 0.055 },
  }),
};

/* ─── Sub-components ─── */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center gap-2.5 sm:mb-10 sm:gap-3">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="relative flex-1">
          <div className="h-[2px] w-full rounded-full bg-hairline overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= current ? 1 : 0 }}
              transition={{ duration: 0.45, ease }}
            />
          </div>
        </div>
      ))}
      <span className="type-caption text-muted ml-1 tabular-nums shrink-0">
        {current + 1} / {TOTAL_STEPS}
      </span>
    </div>
  );
}

function SelectCard({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-lg border px-4 py-3 text-left transition-all duration-200 cursor-pointer group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-primary/6 text-primary"
          : "border-hairline bg-canvas text-muted hover:border-primary/35 hover:text-body hover:bg-surface-soft/60",
        className,
      )}
    >
      {active && (
        <motion.div
          layoutId="card-highlight"
          className="absolute inset-0 rounded-lg bg-primary/5"
          transition={{ duration: 0.22, ease }}
        />
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </button>
  );
}

function Chip({
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
        "relative h-9 rounded-pill border px-4 flex items-center justify-center type-caption transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-primary/8 text-primary"
          : "border-hairline bg-canvas text-muted hover:border-primary/35 hover:text-body",
      )}
    >
      <span className="flex items-center justify-center w-full h-full leading-none">
        {children}
      </span>
    </button>
  );
}

function StepHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <motion.div
      className="mb-8"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      custom={0}
    >
      <p className="type-caption-upper text-primary mb-2">{eyebrow}</p>
      <h2 className="type-display-md text-ink mb-1.5">{title}</h2>
      <p className="type-body-sm text-muted">{sub}</p>
    </motion.div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="type-caption text-body mb-2.5">{children}</p>;
}

/* ─── Steps ─── */

function Step0({
  data,
  setData,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Getting started"
        title="Let's build your profile."
        sub="A few quick answers help Counselly personalise every recommendation from day one."
      />

      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={1}>
        <FieldLabel>Your full name</FieldLabel>
        <input
          type="text"
          value={data.fullName}
          onChange={(e) => setData((d) => ({ ...d, fullName: e.target.value }))}
          placeholder="Aarav Sharma"
          className={cn(
            "w-full h-12 rounded-md border border-hairline bg-canvas px-4",
            "type-body-md text-ink outline-none placeholder:text-muted-soft",
            "transition-all duration-200",
            "focus:border-primary focus:ring-3 focus:ring-primary/15",
          )}
        />
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={2}>
        <FieldLabel>Your current stage</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {GRADE_OPTIONS.map((g, i) => (
            <motion.div
              key={g.value}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={3 + i * 0.5}
            >
              <SelectCard
                active={data.grade === g.value}
                onClick={() => setData((d) => ({ ...d, grade: g.value }))}
                className="w-full h-11 flex items-center justify-center text-center py-0 type-caption"
              >
                <span className="flex items-center justify-center w-full h-full leading-none">
                  {g.label}
                </span>
              </SelectCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function Step1({
  data,
  setData,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const toggleCountry = useCallback(
    (v: string) =>
      setData((d) => ({
        ...d,
        targetCountries: d.targetCountries.includes(v)
          ? d.targetCountries.filter((x) => x !== v)
          : [...d.targetCountries, v],
      })),
    [setData],
  );
  const [showAllCountries, setShowAllCountries] = useState(false);
  const hasHiddenCountry = data.targetCountries.some((c) => !PRIMARY_COUNTRY_VALUES.has(c));
  const showAll = showAllCountries || hasHiddenCountry;
  const visibleCountries = showAll ? COUNTRY_OPTIONS : PRIMARY_COUNTRY_OPTIONS;

  // India track sub-question: only for ambiguous majors
  const showIndiaTrack =
    data.targetCountries.includes("India") &&
    ["Sciences", "Undecided"].includes(data.intendedMajor);

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Your targets"
        title="Where do you want to go?"
        sub="Pick every country you're open to. We'll factor in options from each."
      />

      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={1}>
        <FieldLabel>Countries you&apos;re considering</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleCountries.map((c, i) => (
            <motion.div
              key={c.value}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={1.5 + i * 0.08}
            >
              <SelectCard
                active={data.targetCountries.includes(c.value)}
                onClick={() => toggleCountry(c.value)}
                className="w-full h-11 px-3 flex items-center justify-center"
              >
                <div className="flex items-center justify-center gap-2.5 w-full h-full">
                  <span className="text-lg leading-none flex items-center shrink-0">{c.emoji}</span>
                  <span className="type-caption font-medium leading-none flex items-center">{c.value}</span>
                </div>
              </SelectCard>
            </motion.div>
          ))}
        </div>
        {PRIMARY_COUNTRY_OPTIONS.length < COUNTRY_OPTIONS.length && !hasHiddenCountry && (
          <button
            type="button"
            onClick={() => setShowAllCountries((v) => !v)}
            className="mt-2 type-caption text-primary hover:underline"
          >
            {showAllCountries ? "Fewer countries" : "More countries"}
          </button>
        )}
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={3}>
        <FieldLabel>Intended field of study</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {MAJOR_OPTIONS.map((m, i) => (
            <motion.div
              key={m}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={3.5 + i * 0.07}
            >
              <SelectCard
                active={data.intendedMajor === m}
                onClick={() => setData((d) => ({ ...d, intendedMajor: m }))}
                className="w-full h-10 flex items-center py-0 type-caption"
              >
                <span className="flex items-center justify-start w-full h-full leading-none">
                  {m}
                </span>
              </SelectCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* India track — only shown when India is selected and major is ambiguous */}
      <AnimatePresence>
        {showIndiaTrack && (
          <motion.div
            key="india-track"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <FieldLabel>For Indian universities, which track?</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INDIA_TRACK_OPTIONS.map((t, i) => (
                  <motion.div
                    key={t.value}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i * 0.08}
                  >
                    <SelectCard
                      active={data.indiaTrack === t.value}
                      onClick={() => setData((d) => ({ ...d, indiaTrack: t.value }))}
                      className="w-full py-3"
                    >
                      <p className="type-caption font-medium leading-none mb-0.5">{t.label}</p>
                      <p
                        className={cn(
                          "text-[0.7rem] leading-tight transition-colors",
                          data.indiaTrack === t.value ? "text-primary/70" : "text-muted-soft",
                        )}
                      >
                        {t.sub}
                      </p>
                    </SelectCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step2({
  data,
  setData,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Education Board"
        title="Which board are you in?"
        sub="Indian schools offer multiple curriculums. Select the one that matches your school board."
      />

      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={1}>
        <FieldLabel>Select your school board</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOARD_OPTIONS.map((b, i) => (
            <motion.div
              key={b.value}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={1.5 + i * 0.08}
            >
              <SelectCard
                active={data.board === b.value}
                onClick={() => setData((d) => ({ ...d, board: b.value }))}
                className="w-full h-12 flex items-center justify-start px-4 py-0 type-caption"
              >
                <span className="flex items-center justify-start w-full h-full leading-none">
                  {b.label}
                </span>
              </SelectCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function Step3({
  data,
  setData,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const toggleHelp = useCallback(
    (v: string) =>
      setData((d) => ({
        ...d,
        helpNeeded: d.helpNeeded.includes(v)
          ? d.helpNeeded.filter((x) => x !== v)
          : [...d.helpNeeded, v],
      })),
    [setData],
  );

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Your application"
        title="One last thing."
        sub="This is what helps Counselly tailor your counselling, not just your college list."
      />

      {/* Financial aid */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={1}>
        <FieldLabel>Financial aid / scholarships</FieldLabel>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {AID_OPTIONS.map((a, i) => (
            <motion.div
              key={a.value}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              custom={1.5 + i * 0.1}
            >
              <SelectCard
                active={data.financialAidImportance === a.value}
                onClick={() =>
                  setData((d) => ({ ...d, financialAidImportance: a.value }))
                }
                className="w-full py-3"
              >
                <p className="type-caption font-medium leading-none mb-0.5">{a.label}</p>
                <p
                  className={cn(
                    "text-[0.7rem] leading-tight transition-colors",
                    data.financialAidImportance === a.value
                      ? "text-primary/70"
                      : "text-muted-soft",
                  )}
                >
                  {a.sub}
                </p>
              </SelectCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Help needed */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible" custom={2}>
        <FieldLabel>What do you need most help with?</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {HELP_OPTIONS.map((h) => (
            <Chip
              key={h}
              active={data.helpNeeded.includes(h)}
              onClick={() => toggleHelp(h)}
            >
              {h}
            </Chip>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Component ─── */

function calculateApplicationCycle(grade: string): string {
  if (grade === "12" || grade === "gap_year") return "2026-27";
  if (grade === "11") return "2027-28";
  if (grade === "10") return "2028-29";
  if (grade === "9") return "2029-30";
  if (grade === "applied") return "applied";
  return "unsure";
}

const DEFAULT_DATA: FormData = {
  fullName: "",
  grade: "",
  board: "",
  targetCountries: [],
  intendedMajor: "",
  indiaTrack: "",
  academicScore: "",
  scoreType: "percentage",
  testsTaken: [],
  testsPlanned: [],
  applicationCycle: "",
  financialAidImportance: "",
  collegeTypePreference: [],
  activities: [],
  helpNeeded: [],
};

function needsIndiaTrack(data: FormData): boolean {
  return (
    data.targetCountries.includes("India") &&
    ["Sciences", "Undecided"].includes(data.intendedMajor)
  );
}

function canAdvance(step: number, data: FormData): boolean {
  if (step === 0) return data.fullName.trim().length >= 2 && Boolean(data.grade);
  if (step === 1) {
    const baseOk = data.targetCountries.length > 0 && Boolean(data.intendedMajor);
    if (needsIndiaTrack(data)) return baseOk && Boolean(data.indiaTrack);
    return baseOk;
  }
  if (step === 2) return Boolean(data.board);
  if (step === 3) return Boolean(data.financialAidImportance) && data.helpNeeded.length > 0;
  return false;
}

export function OnboardingFlow({ initialName = "" }: { initialName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FormData>({ ...DEFAULT_DATA, fullName: initialName });

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
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

      // Determine india_track: use explicit selection or derive it
      let indiaTrack: string | null = null;
      if (data.targetCountries.includes("India")) {
        if (data.indiaTrack) {
          indiaTrack = data.indiaTrack;
        } else if (data.intendedMajor === "Medicine & Healthcare") {
          indiaTrack = "neet";
        } else if (data.intendedMajor === "Engineering & CS") {
          indiaTrack = ["IB", "Cambridge"].includes(data.board) ? "holistic" : "jee";
        } else if (
          ["Business & Economics", "Humanities & Social Sciences", "Arts & Design", "Law & Political Science"].includes(data.intendedMajor)
        ) {
          indiaTrack = "holistic";
        }
      }

      const { error: upsertError } = await supabase.from("counselly_profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: data.fullName.trim(),
        grade: data.grade,
        board: data.board,
        target_countries: data.targetCountries,
        intended_major: data.intendedMajor,
        india_track: indiaTrack,
        academic_score: data.academicScore || null,
        score_type: data.scoreType,
        tests_taken: data.testsTaken,
        tests_planned: data.testsPlanned,
        application_cycle: calculateApplicationCycle(data.grade),
        financial_aid_importance: data.financialAidImportance,
        college_type_preference: data.collegeTypePreference,
        activities: data.activities,
        help_needed: data.helpNeeded,
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

  const steps = [Step0, Step1, Step2, Step3];
  const StepComponent = steps[step];

  return (
    <div className="mx-auto w-full max-w-[540px]">
      <ProgressBar current={step} />

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <StepComponent data={data} setData={setData} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-6 rounded-md border border-error/30 bg-error/5 px-4 py-3 type-body-sm text-ink"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        className={cn(
          "mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4",
          step > 0 ? "sm:justify-between" : "sm:justify-end",
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.1 }}
      >
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={pending}
            className="h-11 w-full rounded-md border border-hairline bg-canvas px-5 text-body type-button transition-all duration-200 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-auto"
          >
            Back
          </button>
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance(step, data)}
            className={cn(
              "h-11 w-full rounded-md bg-primary px-6 text-on-primary type-button sm:h-10 sm:w-auto",
              "transition-all duration-200 cursor-pointer",
              "hover:bg-primary-active",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canAdvance(step, data) || pending}
            className={cn(
              "relative h-11 w-full overflow-hidden rounded-md bg-primary px-6 text-on-primary type-button sm:h-10 sm:w-auto",
              "transition-all duration-200 cursor-pointer",
              "hover:bg-primary-active",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Setting up…
              </span>
            ) : (
              "Go to dashboard →"
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
