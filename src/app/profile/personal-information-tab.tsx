"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileContext } from "@/types/profile-context";
import type { ProfileData } from "./types";
import { updateBasics, updatePersonalDetails } from "./actions";
import {
  type PersonalDetails,
  parsePersonalDetails,
  PRONOUN_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/personal-details";
import {
  profileInputCls,
  ProfileFieldLabel,
  ProfileCustomSelect,
  DateOfBirthPicker,
} from "./profile-fields";

const GRADE_OPTIONS = [
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
  { value: "gap_year", label: "Gap Year" },
  { value: "applied", label: "Applied / Enrolled" },
];

const BOARD_OPTIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE_ISC", label: "ICSE/ISC" },
  { value: "IB", label: "IB" },
  { value: "Cambridge", label: "Cambridge" },
  { value: "State Board", label: "State Board" },
  { value: "Other", label: "Other" },
];

const COUNTRY_OPTIONS = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "Netherlands",
  "India",
  "Japan",
  "Hong Kong",
  "South Korea",
  "France",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
  "Norway",
  "Denmark",
  "Belgium",
  "Austria",
  "Switzerland",
  "Other",
];

const MAJOR_OPTIONS = [
  { value: "Engineering & CS", label: "Engineering & CS" },
  { value: "Business & Economics", label: "Business & Economics" },
  { value: "Sciences", label: "Sciences" },
  { value: "Arts & Design", label: "Arts & Design" },
  { value: "Humanities & Social Sciences", label: "Humanities & Social Sciences" },
  { value: "Medicine & Healthcare", label: "Medicine & Healthcare" },
  { value: "Law & Political Science", label: "Law & Political Science" },
  { value: "Undecided", label: "Undecided" },
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

const FINANCIAL_AID_LABELS: Record<string, string> = {
  critical: "Critical",
  helpful: "Helpful",
  not_needed: "Not needed",
};

const PERSONAL_KEYS = [
  "preferred_pronouns",
  "gender",
  "date_of_birth",
  "location",
  "phone",
  "bio",
  "linkedin_url",
] as const satisfies readonly (keyof PersonalDetails)[];

function normalizePersonalDetails(d: PersonalDetails): PersonalDetails {
  return Object.fromEntries(
    PERSONAL_KEYS.map((k) => [k, (d[k] ?? "").trim()]),
  ) as PersonalDetails;
}

function personalDetailsEqual(a: PersonalDetails, b: PersonalDetails): boolean {
  const na = normalizePersonalDetails(a);
  const nb = normalizePersonalDetails(b);
  return PERSONAL_KEYS.every((k) => na[k] === nb[k]);
}

type PlanFormState = {
  grade: string;
  board: string;
  target_countries: string[];
  intended_major: string;
  financial_aid_importance: string;
  help_needed: string[];
};

function planFormFromProfile(profile: ProfileData | null): PlanFormState {
  return {
    grade: profile?.grade ?? "",
    board: profile?.board ?? "",
    target_countries: profile?.target_countries ?? [],
    intended_major: profile?.intended_major ?? "",
    financial_aid_importance: profile?.financial_aid_importance ?? "",
    help_needed: profile?.help_needed ?? [],
  };
}

function stringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function planFormEqual(a: PlanFormState, b: PlanFormState): boolean {
  return (
    a.grade === b.grade &&
    a.board === b.board &&
    a.intended_major === b.intended_major &&
    a.financial_aid_importance === b.financial_aid_importance &&
    stringArraysEqual(a.target_countries, b.target_countries) &&
    stringArraysEqual(a.help_needed, b.help_needed)
  );
}

function SaveButton({
  pending,
  saved,
  onClick,
  disabled,
}: {
  pending: boolean;
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-50 sm:h-9 sm:w-auto"
    >
      {saved ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Saved
        </>
      ) : pending ? (
        "Saving…"
      ) : (
        "Save"
      )}
    </button>
  );
}

function DisplayField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  const text = value?.trim();
  return (
    <div className={className}>
      <dt className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
        {label}
      </dt>
      <dd className={cn("type-body-sm", text ? "text-ink" : "text-muted")}>{text || "—"}</dd>
    </div>
  );
}

export function PersonalInformationTab({
  profile,
  ctx,
  displayName,
  displayCycle,
}: {
  profile: ProfileData | null;
  ctx: ProfileContext;
  displayName: string | null;
  displayCycle: string | null;
}) {
  const parsedDetails = parsePersonalDetails(profile?.personal_details);

  const [editingPlan, setEditingPlan] = useState(false);
  const [personalPending, startPersonalTransition] = useTransition();
  const [planPending, startPlanTransition] = useTransition();
  const [personalSaved, setPersonalSaved] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [personalForm, setPersonalForm] = useState<PersonalDetails>(parsedDetails);
  const [savedPersonal, setSavedPersonal] = useState<PersonalDetails>(() =>
    normalizePersonalDetails(parsedDetails),
  );

  const initialPlan = planFormFromProfile(profile);
  const [planForm, setPlanForm] = useState<PlanFormState>(initialPlan);
  const [savedPlan, setSavedPlan] = useState<PlanFormState>(initialPlan);

  const personalDirty = useMemo(
    () => !personalDetailsEqual(personalForm, savedPersonal),
    [personalForm, savedPersonal],
  );
  const planDirty = useMemo(
    () => !planFormEqual(planForm, savedPlan),
    [planForm, savedPlan],
  );

  const setPersonal = (key: keyof PersonalDetails, value: string) =>
    setPersonalForm((d) => ({ ...d, [key]: value }));

  function toggleCountry(c: string) {
    setPlanForm((f) => ({
      ...f,
      target_countries: f.target_countries.includes(c)
        ? f.target_countries.filter((x) => x !== c)
        : [...f.target_countries, c],
    }));
  }

  function toggleHelp(h: string) {
    setPlanForm((f) => ({
      ...f,
      help_needed: f.help_needed.includes(h)
        ? f.help_needed.filter((x) => x !== h)
        : [...f.help_needed, h],
    }));
  }

  function handleSavePersonal() {
    startPersonalTransition(async () => {
      setPersonalError(null);
      const result = await updatePersonalDetails(personalForm);
      if (result.error) {
        setPersonalError(result.error);
        return;
      }
      setSavedPersonal(normalizePersonalDetails(personalForm));
      setPersonalSaved(true);
      setTimeout(() => setPersonalSaved(false), 1200);
    });
  }

  function handleSavePlan() {
    startPlanTransition(async () => {
      setPlanError(null);
      const result = await updateBasics({
        full_name: profile?.full_name ?? "",
        ...planForm,
      });
      if (result.error) {
        setPlanError(result.error);
        return;
      }
      setSavedPlan({ ...planForm });
      setPlanSaved(true);
      setTimeout(() => {
        setPlanSaved(false);
        setEditingPlan(false);
      }, 1200);
    });
  }

  function handleCancelPlan() {
    setPlanForm(savedPlan);
    setPlanError(null);
    setEditingPlan(false);
  }

  const gradeLabel =
    GRADE_OPTIONS.find((g) => g.value === profile?.grade)?.label ?? profile?.grade;
  const boardLabel = profile?.board?.replace("ICSE_ISC", "ICSE/ISC");
  const countriesLabel = ctx.targetCountries.join(", ");
  const financialLabel =
    profile?.financial_aid_importance &&
    FINANCIAL_AID_LABELS[profile.financial_aid_importance]
      ? FINANCIAL_AID_LABELS[profile.financial_aid_importance]
      : profile?.financial_aid_importance;
  const helpLabel = profile?.help_needed?.length ? profile.help_needed.join(", ") : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-hairline bg-surface-card p-4 sm:p-5">
        <p className="type-caption text-ink mb-5 sm:mb-6">Personal information</p>

        <div className="flex flex-col gap-6 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <ProfileFieldLabel>Name</ProfileFieldLabel>
              <p className="type-body-sm text-ink h-9 flex items-center">
                {displayName || "—"}
              </p>
            </div>
            <div>
              <ProfileFieldLabel>Cycle</ProfileFieldLabel>
              <p className="type-body-sm text-ink h-9 flex items-center">
                {displayCycle || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <ProfileFieldLabel>Pronouns</ProfileFieldLabel>
              <ProfileCustomSelect
                value={personalForm.preferred_pronouns ?? ""}
                onChange={(v) => setPersonal("preferred_pronouns", v)}
                options={[...PRONOUN_OPTIONS]}
                placeholder="Select"
              />
            </div>
            <div>
              <ProfileFieldLabel>Gender</ProfileFieldLabel>
              <ProfileCustomSelect
                value={personalForm.gender ?? ""}
                onChange={(v) => setPersonal("gender", v)}
                options={[...GENDER_OPTIONS]}
                placeholder="Select"
              />
            </div>
          </div>

          <div>
            <ProfileFieldLabel>Date of birth</ProfileFieldLabel>
            <DateOfBirthPicker
              value={personalForm.date_of_birth ?? ""}
              onChange={(v) => setPersonal("date_of_birth", v)}
            />
          </div>

          <div>
            <ProfileFieldLabel>Location</ProfileFieldLabel>
            <input
              className={profileInputCls}
              value={personalForm.location ?? ""}
              onChange={(e) => setPersonal("location", e.target.value)}
              placeholder="City"
            />
          </div>

          <div className="max-w-xs">
            <ProfileFieldLabel>Phone</ProfileFieldLabel>
            <input
              type="tel"
              className={profileInputCls}
              value={personalForm.phone ?? ""}
              onChange={(e) => setPersonal("phone", e.target.value)}
              placeholder="+91"
            />
          </div>

          <div>
            <ProfileFieldLabel>Bio</ProfileFieldLabel>
            <textarea
              value={personalForm.bio ?? ""}
              onChange={(e) => setPersonal("bio", e.target.value)}
              placeholder="Optional"
              rows={3}
              className={cn(profileInputCls, "h-auto py-2 resize-none max-w-2xl")}
            />
          </div>

          <div>
            <ProfileFieldLabel>LinkedIn</ProfileFieldLabel>
            <input
              type="url"
              className={profileInputCls}
              value={personalForm.linkedin_url ?? ""}
              onChange={(e) => setPersonal("linkedin_url", e.target.value)}
              placeholder="URL"
            />
          </div>
        </div>

        {personalError && <p className="type-body-sm text-error mt-4">{personalError}</p>}
        <div className="mt-6">
          <SaveButton
            pending={personalPending}
            saved={personalSaved}
            onClick={handleSavePersonal}
            disabled={!personalDirty}
          />
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface-card p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <p className="type-caption text-ink">Application plan</p>
          <button
            type="button"
            onClick={() => (editingPlan ? handleCancelPlan() : setEditingPlan(true))}
            className="type-caption text-primary hover:underline flex items-center gap-1"
          >
            {editingPlan ? (
              <>
                <X className="h-3 w-3" />
                Cancel
              </>
            ) : (
              "Edit"
            )}
          </button>
        </div>

        {!editingPlan ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-2xl">
            <DisplayField label="Grade" value={gradeLabel} />
            <DisplayField label="Board" value={boardLabel} />
            <DisplayField label="Countries" value={countriesLabel || null} />
            <DisplayField label="Major" value={profile?.intended_major} />
            <DisplayField label="Financial aid" value={financialLabel} />
            <DisplayField label="Help" value={helpLabel} className="sm:col-span-2" />
          </dl>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <ProfileFieldLabel>Grade</ProfileFieldLabel>
                <ProfileCustomSelect
                  value={planForm.grade}
                  onChange={(v) => setPlanForm((f) => ({ ...f, grade: v }))}
                  options={GRADE_OPTIONS}
                />
              </div>
              <div>
                <ProfileFieldLabel>Board</ProfileFieldLabel>
                <ProfileCustomSelect
                  value={planForm.board}
                  onChange={(v) => setPlanForm((f) => ({ ...f, board: v }))}
                  options={BOARD_OPTIONS}
                />
              </div>
            </div>

            <div>
              <ProfileFieldLabel>Major</ProfileFieldLabel>
              <ProfileCustomSelect
                value={planForm.intended_major}
                onChange={(v) => setPlanForm((f) => ({ ...f, intended_major: v }))}
                options={MAJOR_OPTIONS}
              />
            </div>

            <div>
              <ProfileFieldLabel>Countries</ProfileFieldLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCountry(c)}
                    className={cn(
                      "rounded-pill px-3 py-1 type-caption border transition-colors",
                      planForm.target_countries.includes(c)
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-canvas text-body border-hairline hover:border-primary/30",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <ProfileFieldLabel>Financial aid</ProfileFieldLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { value: "critical", label: "Critical" },
                  { value: "helpful", label: "Helpful" },
                  { value: "not_needed", label: "Not needed" },
                ].map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() =>
                      setPlanForm((f) => ({ ...f, financial_aid_importance: a.value }))
                    }
                    className={cn(
                      "rounded-pill px-3 py-1 type-caption border transition-colors",
                      planForm.financial_aid_importance === a.value
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-canvas text-body border-hairline hover:border-primary/30",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <ProfileFieldLabel>Help</ProfileFieldLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {HELP_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHelp(h)}
                    className={cn(
                      "rounded-pill px-3 py-1 type-caption border transition-colors",
                      planForm.help_needed.includes(h)
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-canvas text-body border-hairline hover:border-primary/30",
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {planError && <p className="type-body-sm text-error">{planError}</p>}
            <SaveButton
              pending={planPending}
              saved={planSaved}
              onClick={handleSavePlan}
              disabled={!planDirty}
            />
          </div>
        )}
      </div>
    </div>
  );
}
