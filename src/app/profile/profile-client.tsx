"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, Trash2, X, Check, ChevronDown, ChevronUp, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AnchoredDropdownPanel,
  useAnchoredDropdown,
} from "@/components/ui/anchored-dropdown";
import type { ProfileContext } from "@/types/profile-context";
import type { ProfileData, TestScoreRow, ActivityRow, HonorRow } from "./types";
import { PersonalInformationTab } from "./personal-information-tab";
import {
  saveEducationInfo,
  saveGradeData,
  savePredictedGrades,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  addHonor,
  updateHonor,
  deleteHonor,
  reorderHonors,
} from "./actions";
import {
  isProfileSectionSlug,
  tabForSlug,
  type ProfileSectionSlug,
} from "./sections";
import { ProfileTabNav } from "./profile-tabs";

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
  { value: "gap_year", label: "Gap Year" },
  { value: "applied", label: "Applied / Enrolled" },
];

const BOARD_OPTIONS = ["CBSE", "ICSE_ISC", "IB", "Cambridge", "State Board", "Other"];

const TEST_NAME_GROUPS: { label: string; options: string[] }[] = [
  { label: "English Proficiency", options: ["IELTS", "TOEFL", "PTE", "Duolingo English Test", "Cambridge C1 Advanced", "Cambridge C2 Proficiency", "Oxford English Test"] },
  { label: "US Undergraduate", options: ["SAT", "ACT", "PSAT", "AP Subject Test", "SAT Subject Test", "CLT"] },
  { label: "US High School Admissions", options: ["SSAT", "ISEE", "HSPT"] },
  { label: "US Graduate", options: ["GRE", "GMAT", "LSAT", "MCAT"] },
  { label: "UK Admissions", options: ["UCAT", "BMAT", "LNAT", "TSA", "MAT", "STEP", "PAT", "HAT", "TMUA", "ELAT", "MLAT", "PHILAT", "OLAT", "CAT", "ENGAA", "NSAA", "PBSAA", "ESAT", "CSAT"] },
  { label: "UK High School", options: ["CIE A-Levels Subject Test", "CIE IGCSE Subject Test", "Pearson Edexcel A-Levels Subject Test", "Pearson Edexcel IGCSE Subject Test", "UK GCE A-Levels Subject Test", "UK GCSE Subject Test", "IB Subject Test", "IB MYP Subject Test"] },
  { label: "Medical Admissions", options: ["GAMSAT", "HPAT", "UCAT ANZ", "AHCAAT", "BMSAT", "TARA"] },
  { label: "EU Admissions", options: ["IMAT", "GSAT", "Cambridge At-Interview Assessment", "MEDTEC Test", "ISAT Exam", "EBAU", "IE University Admissions", "EHL Admissions", "ETH Zurich Entrance", "Bocconi Online Assessment", "English TOLC-I", "English TOLC-E", "English TOLC-F", "Architecture TIL Test", "EU Architecture Admissions Assessment", "EU HUMAT", "UCAT Camillus", "Studienkolleg Feststellungsprüfung", "TestAS", "TestDaF", "DSH", "Hochschulstart NC", "Abitur Equivalent"] },
  { label: "Netherlands", options: ["VWO Biology", "VWO Chemistry", "VWO Mathematics A", "VWO Mathematics B", "VWO Mathematics C", "VWO Physics", "CCVX Biology", "CCVX Chemistry", "CCVX Mathematics A", "CCVX Mathematics B", "CCVX Physics"] },
  { label: "Australian / NZ", options: ["ATAR", "UMAT", "STAT"] },
  { label: "Canadian", options: ["SSAT Canada", "MCAT Canada"] },
  { label: "Singapore / Asia", options: ["A-Levels H1/H2 Subject Test", "H3 Subject Test", "O-Levels Subject Test", "HKDSE Subject Test", "Gaokao", "CSAT (Korea)", "ENEM"] },
  { label: "India", options: ["JEE Mains", "JEE Advanced", "NEET", "CUET", "CLAT", "AILET", "IPMAT", "NPAT", "SET", "BITSAT", "VITEEE", "SRMEEE", "MHT CET", "KCET", "KEAM", "AP EAPCET", "TS EAPCET", "COMEDK", "WBJEE", "OJEE", "UPCET", "GUJCET", "CUSAT CAT", "JIPMER", "NMAT", "XAT", "SNAP", "IIFT", "TISSNET"] },
  { label: "Language Proficiency (Other)", options: ["DELF A2", "DELF B1", "DELF B2", "DALF C1", "DALF C2", "DELE A2", "DELE B1", "DELE B2", "DELE C1", "DELE C2", "Goethe A1", "Goethe A2", "Goethe B1", "Goethe B2", "Goethe C1", "Goethe C2", "NT2", "HSK", "JLPT", "TOPIK", "CILS", "CELI", "PLIDA"] },
  { label: "Other", options: ["OTHER"] },
];

const TEST_MAX_SCORES: Record<string, string> = {
  // US Undergraduate
  "SAT": "1600",
  "ACT": "36",
  "PSAT": "1520",
  "AP Subject Test": "5",
  "SAT Subject Test": "800",
  "CLT": "120",
  // US High School Admissions
  "SSAT": "2400",
  // US Graduate
  "LSAT": "180",
  "MCAT": "528",
  // English Proficiency
  "IELTS": "9",
  "TOEFL": "120",
  "PTE": "90",
  "Duolingo English Test": "160",
  "Cambridge C1 Advanced": "210",
  "Cambridge C2 Proficiency": "210",
  // UK Admissions
  "UCAT": "3600",
  "BMAT": "9",
  "LNAT": "42",
  "MAT": "100",
  "PAT": "100",
  "STEP": "120",
  "TSA": "100",
  "TMUA": "9",
  "ESAT": "9",
  // Medical
  "GAMSAT": "100",
  "HPAT": "300",
  // India
  "JEE Mains": "300",
  "NEET": "720",
  "CLAT": "150",
  "BITSAT": "390",
  "CUET": "800",
  // High School / IB
  "IB Subject Test": "7",
  "IB MYP Subject Test": "7",
  "CIE A-Levels Subject Test": "600",
  "CIE IGCSE Subject Test": "100",
  "Pearson Edexcel A-Levels Subject Test": "600",
  "Pearson Edexcel IGCSE Subject Test": "100",
  "UK GCE A-Levels Subject Test": "600",
  "UK GCSE Subject Test": "100",
  // Other
  "GRE": "340",
  "GMAT": "805",
};

const ACTIVITY_TYPE_GROUPS: { label: string; options: string[] }[] = [
  { label: "Sports & Athletics", options: ["Athletics (Team)", "Athletics (Individual)", "Martial Arts", "Swimming / Diving", "Tennis / Racquet Sports", "Golf", "Gymnastics", "Dance (Sport)", "Chess / Mind Sports", "Esports"] },
  { label: "Performing Arts", options: ["Drama / Theater", "Music (Instrumental)", "Music (Vocal)", "Band / Orchestra", "Choir", "Dance (Performance)", "Film / Media Production", "Stand-up / Improv Comedy"] },
  { label: "Academic & Intellectual", options: ["Science / Research", "Math Competition", "Debate / Speech", "Model UN", "Academic Decathlon / Olympiad", "Writing / Literary", "Quiz / Trivia", "Philosophy / Ethics"] },
  { label: "Technology", options: ["Robotics", "Coding / App Development", "Astronomy / Space", "Engineering", "Cybersecurity", "AI / Machine Learning"] },
  { label: "Community & Service", options: ["Community Service", "Volunteering", "Environmental / Sustainability", "Religious Service", "Social Justice / Activism", "Nonprofit / Fundraising", "Tutoring / Teaching", "Healthcare / Medical Volunteering"] },
  { label: "Student Life", options: ["Student Government", "School Newspaper / Yearbook", "Class Representative", "Peer Mentoring", "School Club / Organization"] },
  { label: "Creative", options: ["Art / Design", "Photography", "Creative Writing", "Journalism / Blogging", "Fashion Design", "Pottery / Sculpture", "Architecture / Urban Design"] },
  { label: "Cultural & Identity", options: ["Cultural Organization", "Language Club", "Religious / Spiritual", "LGBTQ+ Organization", "Indigenous / Heritage Group"] },
  { label: "Career & Business", options: ["Internship", "Entrepreneurship / Startup", "Business Club", "Investment / Finance Club", "Law / Pre-law", "Pre-med / Healthcare Club"] },
  { label: "Personal & Other", options: ["Work (Paid)", "Family Responsibilities", "Travel / Study Abroad", "Foreign Exchange", "Independent Study", "Other"] },
];

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls = "h-9 w-full rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40";
const selectCls = "h-9 rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 bg-canvas";

// ─── CustomSelect ────────────────────────────────────────────────────────────

function CustomSelect({
  value, onChange, options, placeholder = "Select…", className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();
  const selected = options.find(o => o.value === value);

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-9 w-full flex items-center justify-between rounded-md border border-hairline bg-canvas px-3 type-body-sm hover:border-primary/30 transition-colors cursor-pointer"
      >
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted shrink-0 transition-transform duration-150", open && "rotate-180")} strokeWidth={1.5} />
      </button>

      <AnchoredDropdownPanel open={open} rect={rect} menuRef={menuRef} className="overflow-hidden py-1">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(o.value); close(); }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 type-body-sm transition-colors text-left cursor-pointer",
              o.value === value
                ? "text-primary bg-primary/5 font-medium"
                : "text-ink hover:bg-surface-soft"
            )}
          >
            {o.label}
            {o.value === value && <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2} />}
          </button>
        ))}
      </AnchoredDropdownPanel>
    </div>
  );
}

// ─── SubjectInput ────────────────────────────────────────────────────────────

function SubjectInput({
  value, onChange, suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions
      .map(s => s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter(s => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }, [suggestions]);

  const query = value.trim().replace(/\([^)]*\)/g, "").trim().toLowerCase();
  const filtered = value.trim()
    ? normalizedSuggestions.filter(s => s.toLowerCase().includes(query))
    : normalizedSuggestions;

  const showMenu = open && filtered.length > 0;

  return (
    <div ref={anchorRef} className="relative">
      <input
        type="text"
        value={value}
        autoComplete="off"
        placeholder="Subject name"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); }}
        className={inputCls}
      />
      <AnchoredDropdownPanel open={showMenu} rect={rect} menuRef={menuRef} className="max-h-48 overflow-y-auto py-1">
        {filtered.slice(0, 10).map(s => (
          <button
            key={s}
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(s); close(); }}
            className={cn(
              "w-full text-left px-3 py-2.5 type-body-sm transition-colors cursor-pointer",
              s === value ? "text-primary bg-primary/5 font-medium" : "text-ink hover:bg-surface-soft"
            )}
          >
            {s}
          </button>
        ))}
      </AnchoredDropdownPanel>
    </div>
  );
}

// ─── AcademicsTab ─────────────────────────────────────────────────────────────

type SubjectEntry = { name: string; score: string; max: string };
type GradeEntry = { class_size: string; class_rank: string; subjects: SubjectEntry[] };

const GRADE_KEYS = ["9", "10", "11", "12"] as const;

const SUBJECTS_BY_BOARD: Record<string, string[]> = {
  CBSE: [
    // Languages
    "English (Core)", "English (Elective)", "Hindi (Core)", "Hindi (Elective)",
    "Sanskrit (Core)", "Sanskrit (Elective)", "French", "German", "Spanish",
    "Urdu (Core)", "Urdu (Elective)", "Tamil", "Telugu", "Kannada", "Marathi",
    "Gujarati", "Punjabi", "Bengali", "Odia", "Assamese", "Nepali",
    "Japanese", "Russian", "Arabic", "Persian",
    // Sciences (9–10)
    "Science", "Environmental Science",
    // Sciences (11–12)
    "Physics", "Chemistry", "Biology", "Biotechnology",
    // Mathematics
    "Mathematics", "Mathematics (Standard)", "Mathematics (Basic)", "Applied Mathematics",
    // Social Studies (9–10)
    "Social Science",
    // Humanities (11–12)
    "History", "Geography", "Political Science", "Economics", "Sociology",
    "Psychology", "Philosophy", "Legal Studies",
    // Commerce (11–12)
    "Business Studies", "Accountancy", "Economics",
    // Computer & Technology
    "Computer Science", "Informatics Practices", "Artificial Intelligence",
    "Information Technology",
    // Vocational & Others
    "Physical Education", "Health & Physical Education", "NCC",
    "Entrepreneurship", "Engineering Graphics", "Home Science",
    "Mass Media Studies", "Fine Arts", "Painting", "Graphic Design",
    "Music (Hindustani)", "Music (Carnatic)", "Dance",
  ],
  ICSE_ISC: [
    // Languages
    "English Language", "English Literature", "Hindi", "French", "German",
    "Spanish", "Sanskrit", "Urdu", "Tamil", "Telugu", "Kannada", "Marathi",
    "Gujarati", "Punjabi", "Bengali", "Arabic",
    // Sciences
    "Physics", "Chemistry", "Biology", "Biotechnology", "Environmental Science",
    "Science",
    // Mathematics
    "Mathematics",
    // Social Studies
    "History & Civics", "History", "Civics", "Geography",
    // Commerce
    "Commerce", "Accounts", "Accountancy", "Business Studies", "Economics",
    // Humanities
    "Sociology", "Psychology", "Political Science",
    // Computer
    "Computer Science", "Computer Applications", "Information Technology",
    "Artificial Intelligence",
    // Others
    "Physical Education", "Art", "Music", "Home Science", "Legal Studies",
    "Fashion Designing",
  ],
  IB: [
    // Language A (Literature & Language)
    "English Language & Literature (HL)", "English Language & Literature (SL)",
    "English Literature (HL)", "English Literature (SL)",
    "Hindi A: Language & Literature", "French A: Language & Literature",
    // Language B
    "French B (HL)", "French B (SL)", "Spanish B (HL)", "Spanish B (SL)",
    "Hindi B (HL)", "Hindi B (SL)", "German B (HL)", "German B (SL)",
    "Mandarin B (HL)", "Mandarin B (SL)", "Japanese B", "Arabic B",
    // Individuals & Societies
    "History (HL)", "History (SL)", "Economics (HL)", "Economics (SL)",
    "Psychology (HL)", "Psychology (SL)", "Geography (HL)", "Geography (SL)",
    "Business Management (HL)", "Business Management (SL)",
    "Global Politics (HL)", "Global Politics (SL)",
    "Philosophy", "Social & Cultural Anthropology",
    "Environmental Systems & Societies",
    // Sciences
    "Physics (HL)", "Physics (SL)", "Chemistry (HL)", "Chemistry (SL)",
    "Biology (HL)", "Biology (SL)", "Computer Science (HL)", "Computer Science (SL)",
    "Sports, Exercise & Health Science",
    // Mathematics
    "Mathematics: Analysis & Approaches (HL)",
    "Mathematics: Analysis & Approaches (SL)",
    "Mathematics: Applications & Interpretation (HL)",
    "Mathematics: Applications & Interpretation (SL)",
    // Arts
    "Visual Arts (HL)", "Visual Arts (SL)", "Theatre (HL)", "Theatre (SL)",
    "Music (HL)", "Music (SL)", "Film", "Dance",
    // Core
    "Theory of Knowledge (TOK)", "Extended Essay (EE)", "CAS",
  ],
  Cambridge: [
    // Languages
    "English Language", "English Literature", "French", "Spanish", "German",
    "Hindi", "Urdu", "Arabic", "Malay", "Chinese", "Japanese", "Latin",
    // Sciences
    "Physics", "Chemistry", "Biology", "Environmental Management",
    "Environmental Science", "Marine Science",
    // Mathematics
    "Mathematics", "Further Mathematics", "Statistics",
    // Humanities
    "History", "Geography", "Economics", "Business Studies", "Law",
    "Sociology", "Psychology", "Philosophy", "Travel & Tourism",
    // Computer
    "Computer Science", "Information Technology",
    // Arts & Others
    "Art & Design", "Music", "Physical Education", "Accounting",
    "Enterprise", "Media Studies",
  ],
  "State Board": [
    "English", "Hindi", "Mathematics", "Science", "Social Science",
    "Sanskrit", "French", "Urdu", "Marathi", "Gujarati", "Tamil",
    "Telugu", "Kannada", "Bengali", "Punjabi",
    "Physics", "Chemistry", "Biology", "History", "Geography",
    "Political Science", "Economics", "Sociology", "Psychology",
    "Commerce", "Accountancy", "Business Studies",
    "Computer Science", "Information Technology",
    "Physical Education", "Fine Arts", "Home Science",
  ],
  Other: [
    "English", "Mathematics", "Sciences", "Humanities", "Languages",
    "Physics", "Chemistry", "Biology", "History", "Geography",
    "Economics", "Business Studies", "Computer Science",
    "Physical Education", "Arts", "Music",
  ],
};

function parseGradeAcademics(raw: Record<string, unknown> | null) {
  if (!raw || raw._v !== 2) return { school_name: "", grades: {} as Record<string, GradeEntry> };
  const { _v: _v2, school_name, ...rest } = raw; void _v2;
  const grades: Record<string, GradeEntry> = {};
  for (const k of GRADE_KEYS) {
    if (rest[k] && typeof rest[k] === "object") {
      const entry = rest[k] as Record<string, unknown>;
      grades[k] = {
        class_size: String(entry.class_size ?? ""),
        class_rank: String(entry.class_rank ?? ""),
        subjects: Array.isArray(entry.subjects) ? (entry.subjects as SubjectEntry[]) : [],
      };
    }
  }
  return { school_name: String(school_name ?? ""), grades };
}

function getDefaultExpanded(grade: string | null): Set<string> {
  const ordered = ["9", "10", "11", "12"];
  if (!grade) return new Set();
  if (grade === "gap_year" || grade === "applied") return new Set(ordered);
  const idx = ordered.indexOf(grade);
  if (idx <= 0) return new Set();
  return new Set(ordered.slice(0, idx));
}

function GradeSection({
  gradeKey, board, initialData, isExpanded, onToggle, propagatedClassSize, onClassSizeSaved,
}: {
  gradeKey: string; board: string; initialData: GradeEntry;
  isExpanded: boolean; onToggle: () => void;
  propagatedClassSize: string; onClassSizeSaved: (size: string) => void;
}) {
  const EMPTY_SUBJECT: SubjectEntry = { name: "", score: "", max: "100" };
  function normalizeSubjects(subjects: SubjectEntry[]) {
    return subjects.filter(s => s.name.trim() || s.score.trim());
  }

  const [local, setLocal] = useState<GradeEntry>({
    class_size: initialData.class_size,
    class_rank: initialData.class_rank,
    subjects: initialData.subjects.length > 0
      ? initialData.subjects.map(s => ({ ...s }))
      : [{ ...EMPTY_SUBJECT }],
  });
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify({
    ...initialData,
    subjects: normalizeSubjects(initialData.subjects),
  }));

  const suggestions = SUBJECTS_BY_BOARD[board] ?? SUBJECTS_BY_BOARD.CBSE;
  const filledSubjects = local.subjects.filter(s => s.name.trim()).length;

  function addSubject() { setLocal(d => ({ ...d, subjects: [...d.subjects, { name: "", score: "", max: "100" }] })); }
  function removeSubject(i: number) { setLocal(d => ({ ...d, subjects: d.subjects.filter((_, j) => j !== i) })); }
  function updateSubject(i: number, field: keyof SubjectEntry, value: string) {
    setLocal(d => ({ ...d, subjects: d.subjects.map((s, j) => j === i ? { ...s, [field]: value } : s) }));
  }

  // Show propagated class_size as a suggestion if this grade's field is empty
  const displayClassSize = local.class_size || propagatedClassSize;
  const isDirty = JSON.stringify({
    ...local,
    class_size: displayClassSize,
    subjects: normalizeSubjects(local.subjects),
  }) !== lastSavedSnapshot;

  async function handleSave() {
    setPending(true); setError(null);
    const dataToSave = {
      ...local,
      class_size: displayClassSize,
      subjects: normalizeSubjects(local.subjects),
    };
    const result = await saveGradeData(gradeKey, dataToSave);
    setPending(false);
    if (result.error) { setError(result.error); return; }
    if (displayClassSize) onClassSizeSaved(displayClassSize);
    setLastSavedSnapshot(JSON.stringify(dataToSave));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={cn(
      "rounded-lg border border-hairline bg-surface-card",
      isExpanded ? "overflow-visible" : "overflow-hidden",
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-soft transition-colors text-left cursor-pointer"
      >
        {isExpanded
          ? <ChevronDown className="h-4 w-4 text-muted shrink-0" strokeWidth={1.5} />
          : <ChevronRight className="h-4 w-4 text-muted shrink-0" strokeWidth={1.5} />
        }
        <span className="type-caption text-ink flex-1">Grade {gradeKey}</span>
        {filledSubjects > 0 ? (
          <span className="flex items-center gap-1.5 type-body-sm text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            {filledSubjects} {filledSubjects === 1 ? "subject" : "subjects"}
          </span>
        ) : (
          <span className="type-body-sm text-muted">Not started</span>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-4">
          {/* Class meta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Class Size</label>
              <input type="text" value={displayClassSize} onChange={e => setLocal(d => ({ ...d, class_size: e.target.value }))} placeholder="e.g. 240" className={inputCls} />
            </div>
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Class Rank</label>
              <input type="text" value={local.class_rank} onChange={e => setLocal(d => ({ ...d, class_rank: e.target.value }))} placeholder="e.g. 12 / 240  or  Top 5%" className={inputCls} />
            </div>
          </div>

          {/* Subject rows */}
          <div>
            <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="min-w-[17.5rem] sm:min-w-0">
                {local.subjects.length > 0 && (
                  <div className="mb-2 grid grid-cols-[1fr_80px_60px_32px] gap-2 px-1">
                    <p className="type-caption-upper text-muted" style={{ fontSize: "0.58rem" }}>Subject</p>
                    <p className="type-caption-upper text-muted" style={{ fontSize: "0.58rem" }}>Score</p>
                    <p className="type-caption-upper text-muted" style={{ fontSize: "0.58rem" }}>Max</p>
                    <span />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  {local.subjects.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_60px_32px] items-center gap-2">
                      <SubjectInput value={s.name} onChange={v => updateSubject(i, "name", v)} suggestions={suggestions} />
                      <input type="text" value={s.score} onChange={e => updateSubject(i, "score", e.target.value)} placeholder="—" className={inputCls} />
                      <input type="text" value={s.max} onChange={e => updateSubject(i, "max", e.target.value)} placeholder="100" className={inputCls} />
                      <button onClick={() => removeSubject(i)} className="flex h-9 w-8 cursor-pointer items-center justify-center text-muted transition-colors hover:text-error">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={addSubject} className="mt-3 flex items-center gap-1.5 type-caption text-muted hover:text-primary transition-colors cursor-pointer">
              <Plus className="h-3.5 w-3.5" />Add a subject
            </button>
          </div>

          {error && <p className="type-body-sm text-error">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={pending || !isDirty}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary hover:bg-primary-active disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saved ? <><Check className="h-3.5 w-3.5" />Saved</> : pending ? "Saving…" : `Save Grade ${gradeKey}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AcademicsTab({ profile, ctx }: { profile: ProfileData | null; ctx: ProfileContext }) {
  const parsed = parseGradeAcademics(profile?.subject_scores as Record<string, unknown> | null);

  const [schoolName, setSchoolName] = useState(parsed.school_name);
  const [board, setBoard] = useState(profile?.board ?? "");
  const [currentGrade, setCurrentGrade] = useState(profile?.grade ?? "");
  const [eduPending, setEduPending] = useState(false);
  const [eduSaved, setEduSaved] = useState(false);
  const [eduError, setEduError] = useState<string | null>(null);
  const [eduSnapshot, setEduSnapshot] = useState(() =>
    JSON.stringify({ schoolName: parsed.school_name, board: profile?.board ?? "", currentGrade: profile?.grade ?? "" })
  );
  const eduIsDirty = JSON.stringify({ schoolName, board, currentGrade }) !== eduSnapshot;

  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(() => getDefaultExpanded(profile?.grade ?? null));
  const [propagatedClassSize, setPropagatedClassSize] = useState("");

  const [predRows, setPredRows] = useState<{ subject: string; grade: string }[]>(
    Object.entries((profile?.predicted_grades as Record<string, string>) ?? {}).map(([s, v]) => ({ subject: s, grade: String(v) }))
  );
  const [predPending, setPredPending] = useState(false);
  const [predSaved, setPredSaved] = useState(false);
  const showPredicted = ctx.targetCountries.includes("UK") || ["IB", "Cambridge"].includes(board);

  async function handleSaveEducation() {
    setEduPending(true); setEduError(null);
    const result = await saveEducationInfo({ school_name: schoolName, board, grade: currentGrade });
    setEduPending(false);
    if (result.error) { setEduError(result.error); return; }
    setEduSnapshot(JSON.stringify({ schoolName, board, currentGrade }));
    setEduSaved(true); setTimeout(() => setEduSaved(false), 2000);
  }

  async function handleSavePredicted() {
    setPredPending(true);
    const result = await savePredictedGrades(predRows);
    setPredPending(false);
    if (!result.error) { setPredSaved(true); setTimeout(() => setPredSaved(false), 2000); }
  }

  function toggleGrade(key: string) {
    setExpandedGrades(s => { const n = new Set(s); if (n.has(key)) { n.delete(key); } else { n.add(key); } return n; });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Education information */}
      <div className="rounded-lg border border-hairline bg-surface-card p-4 sm:p-5">
        <p className="type-caption text-ink mb-4">Education information</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>School / Institution Name</label>
            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. DPS Vasant Kunj" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Board / Curriculum</label>
              <CustomSelect
                value={board}
                onChange={setBoard}
                options={BOARD_OPTIONS.map(b => ({ value: b, label: b.replace("ICSE_ISC", "ICSE/ISC") }))}
              />
            </div>
            <div>
              <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Current Grade</label>
              <CustomSelect
                value={currentGrade}
                onChange={setCurrentGrade}
                options={GRADE_OPTIONS}
              />
            </div>
          </div>
          {profile?.application_cycle && (
            <p className="type-body-sm text-muted">Application cycle: <span className="text-ink">{profile.application_cycle}</span></p>
          )}
          {eduError && <p className="type-body-sm text-error">{eduError}</p>}
          <div>
            <button onClick={handleSaveEducation} disabled={eduPending || !eduIsDirty} className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto">
              {eduSaved ? <><Check className="h-3.5 w-3.5" />Saved</> : eduPending ? "Saving…" : "Save education info"}
            </button>
          </div>
        </div>
      </div>

      {/* School Academics — per grade */}
      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="type-caption text-ink">School academics</p>
          <p className="type-body-sm text-muted">Overall average is auto-computed from your subjects.</p>
        </div>
        <div className="flex flex-col gap-2">
          {GRADE_KEYS.map(key => (
            <GradeSection
              key={key}
              gradeKey={key}
              board={board}
              propagatedClassSize={propagatedClassSize}
              onClassSizeSaved={setPropagatedClassSize}
              initialData={parsed.grades[key] ?? { class_size: "", class_rank: "", subjects: [] }}
              isExpanded={expandedGrades.has(key)}
              onToggle={() => toggleGrade(key)}
            />
          ))}
        </div>
      </div>

      {/* Predicted grades — UK/IB only */}
      {showPredicted && (
        <div className="rounded-lg border border-hairline bg-surface-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="type-caption text-ink">Predicted grades</p>
              <p className="type-body-sm text-muted mt-0.5">Required for UCAS — predicted A-Level / IB grades.</p>
            </div>
            <button onClick={() => setPredRows(r => [...r, { subject: "", grade: "" }])} className="type-caption flex cursor-pointer items-center gap-1 self-start text-primary hover:underline sm:self-auto">
              <Plus className="h-3 w-3" />Add
            </button>
          </div>
          {predRows.length === 0 ? (
            <p className="type-body-sm text-muted mb-4">No predicted grades added yet.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {predRows.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="text" value={row.subject} onChange={e => setPredRows(r => r.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))} placeholder="Subject" className={cn(inputCls, "min-w-0 flex-1")} />
                  <div className="flex items-center gap-2">
                  <input type="text" value={row.grade} onChange={e => setPredRows(r => r.map((x, j) => j === i ? { ...x, grade: e.target.value } : x))} placeholder="A*" className={cn(inputCls, "w-20 shrink-0 sm:max-w-[80px]")} />
                  <button onClick={() => setPredRows(r => r.filter((_, j) => j !== i))} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-error"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleSavePredicted} disabled={predPending} className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-50 sm:h-9 sm:w-auto">
            {predSaved ? <><Check className="h-3.5 w-3.5" />Saved</> : predPending ? "Saving…" : "Save predicted grades"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TestNameInput ────────────────────────────────────────────────────────────

function TestNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();

  const query = value.trim().toLowerCase();
  const filteredGroups = query
    ? TEST_NAME_GROUPS.map(g => ({
        ...g,
        options: g.options.filter(o => o.toLowerCase().includes(query)),
      })).filter(g => g.options.length > 0)
    : TEST_NAME_GROUPS;

  return (
    <div ref={anchorRef} className="relative">
      <input
        type="text"
        value={value}
        autoComplete="off"
        placeholder="e.g. SAT"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); }}
        className={inputCls}
      />
      <AnchoredDropdownPanel open={open} rect={rect} menuRef={menuRef} className="max-h-64 overflow-y-auto py-1">
        {filteredGroups.map(g => (
          <div key={g.label}>
            <p className="px-3 pt-2 pb-1 type-caption-upper text-muted" style={{ fontSize: "0.55rem" }}>{g.label}</p>
            {g.options.map(o => (
              <button
                key={o}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(o); close(); }}
                className={cn(
                  "w-full text-left px-4 py-2 type-body-sm transition-colors cursor-pointer",
                  o === value ? "text-primary bg-primary/5 font-medium" : "text-ink hover:bg-surface-soft"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-2 type-body-sm text-muted">No matches — type to use custom name</p>
        )}
      </AnchoredDropdownPanel>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
  { value: "postponed", label: "Postponed" },
  { value: "registered", label: "Registered" },
];

const SUBJECT_REQUIRED_TESTS = new Set([
  "AP Subject Test",
  "SAT Subject Test",
  "CIE A-Levels Subject Test",
  "CIE IGCSE Subject Test",
  "Pearson Edexcel A-Levels Subject Test",
  "Pearson Edexcel IGCSE Subject Test",
  "UK GCE A-Levels Subject Test",
  "UK GCSE Subject Test",
  "IB Subject Test",
  "IB MYP Subject Test",
  "H3 Subject Test",
  "O-Levels Subject Test",
  "HKDSE Subject Test",
  "A-Levels H1/H2 Subject Test",
]);

// ─── CustomDropdown ───────────────────────────────────────────────────────────

function CustomDropdown({
  value, onChange, options, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();
  const selected = options.find(o => o.value === value);

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => { setOpen(!open); }}
        className={cn(inputCls, "flex items-center justify-between cursor-pointer")}
      >
        <span className={selected ? "text-ink" : "text-muted"}>{selected?.label ?? placeholder ?? "Select"}</span>
        <svg className="h-3.5 w-3.5 text-muted shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <AnchoredDropdownPanel open={open} rect={rect} menuRef={menuRef} className="max-h-52 overflow-y-auto py-1">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(o.value); close(); }}
            className={cn(
              "w-full text-left px-3 py-2.5 type-body-sm transition-colors flex items-center gap-2 cursor-pointer",
              o.value === value ? "text-primary bg-primary/5 font-medium" : "text-ink hover:bg-surface-soft"
            )}
          >
            {o.value === value && <Check className="h-3 w-3 shrink-0" />}
            {o.label}
          </button>
        ))}
      </AnchoredDropdownPanel>
    </div>
  );
}

// ─── MonthYearPicker ──────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const year = value ? value.slice(0, 4) : "";
  const month = value ? value.slice(5, 7) : "";

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const y = String(currentYear - 5 + i);
    return { value: y, label: y };
  });

  function handleMonth(m: string) {
    const y = year || String(currentYear);
    onChange(`${y}-${m}-01`);
  }
  function handleYear(y: string) {
    const m = month || "01";
    onChange(`${y}-${m}-01`);
  }

  return (
    <div className="flex gap-1.5">
      <CustomDropdown value={month} onChange={handleMonth} options={MONTH_OPTIONS} placeholder="Month" className="flex-1" />
      <CustomDropdown value={year} onChange={handleYear} options={yearOptions} placeholder="Year" className="flex-1" />
    </div>
  );
}

// ─── TestsTab ─────────────────────────────────────────────────────────────────

const EMPTY_TEST_FORM = { test_name: "", subject: "", status: "planned", score: "", max_score: "", test_date: "", planned_date: "" };

function TestsTab({ testScores }: { testScores: TestScoreRow[] }) {
  const hasTests = testScores.length > 0;
  const [showForm, setShowForm] = useState(!hasTests);
  const [form, setForm] = useState({ ...EMPTY_TEST_FORM });
  const [addPending, startAddTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof EMPTY_TEST_FORM>({ ...EMPTY_TEST_FORM });
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const needsSubject = SUBJECT_REQUIRED_TESTS.has(form.test_name);
  const canAdd = form.test_name.trim().length > 0 && (!needsSubject || form.subject.trim().length > 0);

  function startEdit(ts: TestScoreRow) {
    const score = ts.total_score?.includes(" / ") ? ts.total_score.split(" / ")[0].trim() : (ts.total_score ?? "");
    const max_score = ts.total_score?.includes(" / ") ? ts.total_score.split(" / ")[1].trim() : (TEST_MAX_SCORES[ts.test_name] ?? "");
    setEditForm({
      test_name: ts.test_name,
      subject: "",
      status: ts.status,
      score,
      max_score,
      test_date: ts.test_date ?? "",
      planned_date: ts.planned_date ?? "",
    });
    setEditError(null);
    setEditingId(ts.id);
  }

  function handleSaveEdit(id: string) {
    startEditTransition(async () => {
      setEditError(null);
      const total_score = editForm.max_score.trim()
        ? `${editForm.score.trim()} / ${editForm.max_score.trim()}`
        : editForm.score.trim();
      const result = await updateTestScore(id, { ...editForm, total_score });
      if (result.error) { setEditError(result.error); return; }
      setEditingId(null);
    });
  }

  function handleAdd() {
    startAddTransition(async () => {
      setAddError(null);
      const total_score = form.max_score.trim()
        ? `${form.score.trim()} / ${form.max_score.trim()}`
        : form.score.trim();
      const test_name = needsSubject && form.subject.trim()
        ? `${form.test_name} — ${form.subject.trim()}`
        : form.test_name;
      const result = await addTestScore({ ...form, test_name, total_score });
      if (result.error) { setAddError(result.error); return; }
      setForm({ ...EMPTY_TEST_FORM });
      setShowForm(false);
    });
  }

  function handleDelete(id: string, testName: string) {
    setDeletingId(id);
    startEditTransition(async () => {
      await deleteTestScore(id, testName);
      setDeletingId(null);
      setEditingId(null);
    });
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      planned: "bg-warning/10 text-warning",
      in_progress: "bg-primary/10 text-primary",
      completed: "bg-success/10 text-success",
      expired: "bg-error/10 text-error",
      postponed: "bg-surface-dark/10 text-muted",
      registered: "bg-ink/10 text-ink",
    };
    const label = STATUS_OPTIONS.find(o => o.value === s)?.label ?? s.replace(/_/g, " ");
    return (
      <span className={cn("rounded-pill px-2.5 py-0.5 type-caption whitespace-nowrap", cls[s] ?? "bg-surface-soft text-muted")}>
        {label}
      </span>
    );
  };

  return (
    <>
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-hairline px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <p className="type-caption text-ink">Testing</p>
          <button
            onClick={() => setShowForm(s => !s)}
            className="type-caption flex cursor-pointer items-center gap-1 text-primary hover:underline self-start sm:self-auto"
          >
            {showForm ? <><X className="h-3 w-3" />Cancel</> : <><Plus className="h-3 w-3" />Add test</>}
          </button>
        </div>

        {hasTests && (
          <div className="divide-y divide-hairline">
            {[...testScores].sort((a, b) => {
              const da = a.test_date || a.planned_date || "9999";
              const db = b.test_date || b.planned_date || "9999";
              return da.localeCompare(db);
            }).map(ts => (
              <div key={ts.id}>
                {/* Collapsed row */}
                <button
                  type="button"
                  onClick={() => editingId === ts.id ? setEditingId(null) : startEdit(ts)}
                  className="flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-surface-soft/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="type-caption text-ink">{ts.test_name}</p>
                    <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                      {ts.total_score && (
                        <span className="type-body-sm text-muted">
                          Score&nbsp;<span className="text-ink font-medium">{ts.total_score}</span>
                        </span>
                      )}
                      {(ts.test_date || ts.planned_date) && (
                        <span className="type-body-sm text-muted">
                          {ts.test_date ? "Date" : "Planned"}&nbsp;
                          <span className="text-ink font-medium">
                            {ts.test_date ? formatDate(ts.test_date) : formatDate(ts.planned_date)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:shrink-0">
                    {statusBadge(ts.status)}
                    {editingId === ts.id
                      ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted" />
                      : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />}
                  </div>
                </button>

                {/* Expanded edit form */}
                {editingId === ts.id && (
                  <div className="flex flex-col gap-3 border-t border-hairline bg-surface-soft px-4 py-4 sm:px-5 sm:py-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Test</label>
                        <TestNameInput value={editForm.test_name} onChange={v => setEditForm(f => ({ ...f, test_name: v, max_score: TEST_MAX_SCORES[v] ?? f.max_score }))} />
                      </div>
                      <div>
                        <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Status</label>
                        <CustomDropdown value={editForm.status} onChange={v => setEditForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
                      </div>
                      <div>
                        <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
                          {editForm.status === "completed" ? "Score" : "Target Score (optional)"}
                        </label>
                        <div className="flex gap-1.5">
                          <input type="text" value={editForm.score} onChange={e => setEditForm(f => ({ ...f, score: e.target.value }))} placeholder="e.g. 1450" className={cn(inputCls, "flex-1")} />
                          <input type="text" value={editForm.max_score} onChange={e => setEditForm(f => ({ ...f, max_score: e.target.value }))} placeholder="Max" className={cn(inputCls, "flex-1")} />
                        </div>
                      </div>
                      <div>
                        <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
                          {editForm.status === "completed" ? "Test Date" : "Planned Date"}
                        </label>
                        <MonthYearPicker
                          value={editForm.status === "completed" ? editForm.test_date : editForm.planned_date}
                          onChange={v => setEditForm(f => editForm.status === "completed" ? { ...f, test_date: v } : { ...f, planned_date: v })}
                        />
                      </div>
                    </div>
                    {editError && <p className="type-body-sm text-error">{editError}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <button
                        onClick={() => handleSaveEdit(ts.id)}
                        disabled={editPending}
                        className="h-10 w-full cursor-pointer rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
                      >
                        {editPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => handleDelete(ts.id, ts.test_name)}
                        disabled={deletingId === ts.id || editPending}
                        className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-error/30 px-4 type-caption text-error transition-colors hover:bg-error/5 disabled:opacity-40 sm:ml-auto sm:h-9 sm:w-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add form inline — only when no tests yet */}
        {showForm && !hasTests && <AddTestForm
          form={form} setForm={setForm}
          needsSubject={needsSubject}
          addError={addError} addPending={addPending} canAdd={canAdd}
          onAdd={handleAdd}
          inline
        />}
      </div>
    </div>

    {/* Add test modal — when tests already exist */}
    {showForm && hasTests && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onMouseDown={e => { if (e.target === e.currentTarget) { setShowForm(false); setForm({ ...EMPTY_TEST_FORM }); } }}
      >
        <div className="flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-hairline bg-canvas shadow-xl sm:rounded-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3.5 sm:px-6 sm:py-4">
            <p className="type-caption text-ink">Add test</p>
            <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_TEST_FORM }); }} className="h-7 w-7 flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <AddTestForm
            form={form} setForm={setForm}
            needsSubject={needsSubject}
            addError={addError} addPending={addPending} canAdd={canAdd}
            onAdd={handleAdd}
          />
        </div>
      </div>
    )}
    </>
  );
}

function AddTestForm({
  form, setForm, needsSubject, addError, addPending, canAdd, onAdd, inline,
}: {
  form: typeof EMPTY_TEST_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_TEST_FORM>>;
  needsSubject: boolean;
  addError: string | null;
  addPending: boolean;
  canAdd: boolean;
  onAdd: () => void;
  inline?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-3", inline ? "border-t border-hairline bg-surface-soft px-4 py-4 sm:px-5" : "px-4 py-4 sm:px-6 sm:py-5")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Test</label>
          <TestNameInput value={form.test_name} onChange={v => setForm(f => ({ ...f, test_name: v, subject: "", max_score: TEST_MAX_SCORES[v] ?? f.max_score }))} />
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Status</label>
          <CustomDropdown value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
        </div>
        {needsSubject && (
          <div className="col-span-1 sm:col-span-2">
            <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="e.g. Computer Science"
              className={inputCls}
              autoFocus
            />
          </div>
        )}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
            {form.status === "completed" ? "Score" : "Target Score (optional)"}
          </label>
          <div className="flex gap-1.5">
            <input type="text" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} placeholder="e.g. 1450" className={cn(inputCls, "flex-1")} />
            <input type="text" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))} placeholder="Max" className={cn(inputCls, "flex-1")} />
          </div>
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>
            {form.status === "completed" ? "Test Date" : "Planned Date"}
          </label>
          <MonthYearPicker
            value={form.status === "completed" ? form.test_date : form.planned_date}
            onChange={v => setForm(f => form.status === "completed" ? { ...f, test_date: v } : { ...f, planned_date: v })}
          />
        </div>
      </div>
      {addError && <p className="type-body-sm text-error">{addError}</p>}
      <button
        onClick={onAdd}
        disabled={addPending || !canAdd}
        className="h-10 w-full cursor-pointer self-start rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
      >
        {addPending ? "Adding…" : "Add test"}
      </button>
    </div>
  );
}

// ─── ActivitiesTab ────────────────────────────────────────────────────────────

const GRADE_KEYS_ACT = ["grade_9", "grade_10", "grade_11", "grade_12"] as const;
const GRADE_LABELS_ACT = ["9", "10", "11", "12"];

const ACTIVITY_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

const ACTIVITY_STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  planned: "bg-warning/10 text-warning",
  completed: "bg-ink/8 text-muted",
  on_hold: "bg-surface-soft text-muted border border-hairline",
};

type ActivityForm = {
  activity_type: string;
  name: string;
  organization: string;
  position: string;
  description: string;
  is_leadership: boolean;
  hours_per_week: string;
  weeks_per_year: string;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  continued_in_college: boolean;
  status: string;
};

const EMPTY_ACTIVITY_FORM: ActivityForm = {
  activity_type: "",
  name: "",
  organization: "",
  position: "",
  description: "",
  is_leadership: false,
  hours_per_week: "",
  weeks_per_year: "",
  grade_9: false,
  grade_10: false,
  grade_11: false,
  grade_12: false,
  continued_in_college: false,
  status: "active",
};

function activityToForm(a: ActivityRow): ActivityForm {
  return {
    activity_type: a.activity_type,
    name: a.name,
    organization: a.organization ?? "",
    position: a.position ?? "",
    description: a.description ?? "",
    is_leadership: a.is_leadership,
    hours_per_week: a.hours_per_week != null ? String(a.hours_per_week) : "",
    weeks_per_year: a.weeks_per_year != null ? String(a.weeks_per_year) : "",
    grade_9: a.grade_9,
    grade_10: a.grade_10,
    grade_11: a.grade_11,
    grade_12: a.grade_12,
    continued_in_college: a.continued_in_college,
    status: a.status ?? "active",
  };
}

// Searchable activity type input
function ActivityTypeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();

  useEffect(() => { setQuery(value); }, [value]);

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? ACTIVITY_TYPE_GROUPS.map(g => ({ ...g, options: g.options.filter(o => o.toLowerCase().includes(q)) })).filter(g => g.options.length > 0)
    : ACTIVITY_TYPE_GROUPS;

  return (
    <div ref={anchorRef} className="relative">
      <input
        type="text"
        value={query}
        autoComplete="off"
        placeholder="Search activity type…"
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); }}
        className={inputCls}
      />
      <AnchoredDropdownPanel open={open} rect={rect} menuRef={menuRef} className="max-h-64 overflow-y-auto py-1">
        {filteredGroups.map(g => (
          <div key={g.label}>
            <p className="px-3 pt-2 pb-1 type-caption-upper text-muted" style={{ fontSize: "0.55rem" }}>{g.label}</p>
            {g.options.map(o => (
              <button
                key={o}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(o); setQuery(o); close(); }}
                className={cn(
                  "w-full text-left px-4 py-2 type-body-sm transition-colors cursor-pointer",
                  o === value ? "text-primary bg-primary/5 font-medium" : "text-ink hover:bg-surface-soft"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-2 type-body-sm text-muted">No matches — type to use custom name</p>
        )}
      </AnchoredDropdownPanel>
    </div>
  );
}

// Styled toggle pill
function TogglePill({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-pill px-3 py-1 type-caption border transition-colors cursor-pointer",
        checked ? "bg-primary text-on-primary border-primary" : "bg-canvas text-body border-hairline hover:border-primary/30"
      )}
    >
      {label}
    </button>
  );
}

// Shared activity form fields
function ActivityFormFields({ form, setForm, idPrefix }: {
  form: ActivityForm;
  setForm: (fn: (f: ActivityForm) => ActivityForm) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="col-span-1 sm:col-span-2">
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Activity Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Robotics Club"
            className={inputCls}
          />
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Activity Type</label>
          <ActivityTypeInput value={form.activity_type} onChange={v => setForm(f => ({ ...f, activity_type: v }))} />
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Status</label>
          <CustomDropdown
            value={form.status}
            onChange={v => setForm(f => ({ ...f, status: v }))}
            options={ACTIVITY_STATUS_OPTIONS}
          />
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Role / Position</label>
          <div className="relative">
            <input
              type="text"
              value={form.position}
              maxLength={50}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              placeholder="e.g. President"
              className={cn(inputCls, "pr-12")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 type-body-sm text-muted pointer-events-none">{form.position.length}/50</span>
          </div>
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Organisation</label>
          <div className="relative">
            <input
              type="text"
              value={form.organization}
              maxLength={100}
              onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
              placeholder="e.g. Delhi Public School"
              className={cn(inputCls, "pr-14")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 type-body-sm text-muted pointer-events-none">{form.organization.length}/100</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="type-caption-upper text-muted" style={{ fontSize: "0.6rem" }}>Description</label>
          <span className="type-body-sm text-muted">{form.description.length}/150</span>
        </div>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 150) }))}
          placeholder="What you did, achieved, or your impact — up to 150 characters"
          rows={2}
          className={cn(inputCls, "h-auto py-2 resize-none")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Hours / Week</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.hours_per_week}
            onChange={e => setForm(f => ({ ...f, hours_per_week: e.target.value.replace(/\D/g, "") }))}
            placeholder="e.g. 5"
            className={inputCls}
          />
        </div>
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Weeks / Year</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.weeks_per_year}
            onChange={e => setForm(f => ({ ...f, weeks_per_year: e.target.value.replace(/\D/g, "") }))}
            placeholder="e.g. 40"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <label className="type-caption-upper text-muted mb-2 block" style={{ fontSize: "0.6rem" }}>Grades</label>
          <div className="flex gap-1.5">
            {GRADE_KEYS_ACT.map((k, i) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm(f => ({ ...f, [k]: !f[k] }))}
                className={cn(
                  "h-8 w-9 rounded-md type-caption border transition-colors cursor-pointer",
                  form[k] ? "bg-primary text-on-primary border-primary" : "bg-canvas text-body border-hairline hover:border-primary/30"
                )}
              >
                {GRADE_LABELS_ACT[i]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-auto">
          <TogglePill
            id={`${idPrefix}-leadership`}
            checked={form.is_leadership}
            onChange={v => setForm(f => ({ ...f, is_leadership: v }))}
            label="Leadership"
          />
          <TogglePill
            id={`${idPrefix}-college`}
            checked={form.continued_in_college}
            onChange={v => setForm(f => ({ ...f, continued_in_college: v }))}
            label="Continues in college"
          />
        </div>
      </div>
    </div>
  );
}

// Per-activity card with inline edit
function ActivityCard({
  activity,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  activity: ActivityRow;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<ActivityForm>(() => activityToForm(activity));
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(activityToForm(activity)));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync form when activity changes from server (after save/revalidation), but not while editing
  useEffect(() => {
    const fresh = activityToForm(activity);
    const freshStr = JSON.stringify(fresh);
    if (freshStr !== snapshot) {
      setForm(fresh);
      setSnapshot(freshStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity]);

  const isDirty = JSON.stringify(form) !== snapshot;

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await updateActivity(activity.id, {
        ...form,
        hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
        weeks_per_year: form.weeks_per_year ? Number(form.weeks_per_year) : null,
      });
      if (result.error) { setError(result.error); return; }
      const newSnap = JSON.stringify(form);
      setSnapshot(newSnap);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDelete() {
    setDeleting(true);
    startTransition(async () => {
      await deleteActivity(activity.id);
    });
  }

  const gradePills = (["grade_9", "grade_10", "grade_11", "grade_12"] as const)
    .map((k, i) => activity[k] ? ["9","10","11","12"][i] : null)
    .filter(Boolean);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border bg-surface-card overflow-hidden transition-all duration-150",
        isDragging ? "opacity-40 scale-[0.99] border-primary/30 shadow-none" : "border-hairline shadow-none",
        isDragOver && !isDragging ? "border-primary/50 shadow-sm" : "",
      )}
    >
      {/* Collapsed header */}
      <div className="flex items-start gap-2 py-4 pl-2 pr-3 sm:items-center sm:gap-4 sm:py-5 sm:pl-3 sm:pr-5">
        <div
          className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-muted transition-colors hover:text-ink active:cursor-grabbing sm:mt-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer text-left"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Row 1: name only */}
          <p className="text-base font-semibold leading-tight text-ink">
            {activity.name || <span className="text-muted italic font-normal">Untitled</span>}
          </p>

          {/* Row 2: position · org */}
          {(activity.position || activity.organization) && (
            <p className="type-body-sm text-body mt-2">
              {[activity.position, activity.organization].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Row 3: description */}
          {activity.description && (
            <p className="type-body-sm text-muted mt-2 line-clamp-2">{activity.description}</p>
          )}

          {/* Row 4: stats + badges */}
          <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-5 flex-wrap">
              {activity.hours_per_week && (
                <span className="type-body-sm text-muted">
                  <span className="text-ink font-medium">{activity.hours_per_week}</span> hrs/wk
                </span>
              )}
              {activity.weeks_per_year && (
                <span className="type-body-sm text-muted">
                  <span className="text-ink font-medium">{activity.weeks_per_year}</span> wks/yr
                </span>
              )}
              {gradePills.length > 0 && (
                <span className="type-body-sm text-muted">
                  Grade{gradePills.length > 1 ? "s" : ""} <span className="text-ink font-medium">{gradePills.join(", ")}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activity.status && activity.status !== "active" && (
                <span className={cn("rounded-pill px-2.5 py-0.5 type-caption", ACTIVITY_STATUS_STYLES[activity.status] ?? "bg-surface-soft text-muted")} style={{ fontSize: "0.65rem" }}>
                  {ACTIVITY_STATUS_OPTIONS.find(o => o.value === activity.status)?.label ?? activity.status}
                </span>
              )}
              {activity.activity_type && (
                <span className="rounded-pill bg-surface-soft border border-hairline px-2.5 py-0.5 type-caption text-muted" style={{ fontSize: "0.65rem" }}>
                  {activity.activity_type}
                </span>
              )}
              {activity.is_leadership && (
                <span className="rounded-pill bg-primary/8 border border-primary/20 px-2.5 py-0.5 type-caption text-primary" style={{ fontSize: "0.65rem" }}>
                  Leadership
                </span>
              )}
              {activity.continued_in_college && (
                <span className="rounded-pill bg-surface-soft border border-hairline px-2.5 py-0.5 type-caption text-muted" style={{ fontSize: "0.65rem" }}>
                  Continues in college
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="h-6 w-6 flex items-center justify-center text-muted hover:text-ink transition-colors shrink-0 cursor-pointer"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="flex flex-col gap-4 border-t border-hairline bg-surface-soft px-4 py-4 sm:px-5">
          <ActivityFormFields form={form} setForm={setForm} idPrefix={activity.id} />

          {error && <p className="type-body-sm text-error">{error}</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
              >
                {saved ? <><Check className="h-3.5 w-3.5" />Saved</> : isPending ? "Saving…" : "Save changes"}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting || isPending}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-error/30 px-4 type-caption text-error transition-colors hover:bg-error/5 disabled:opacity-40 sm:ml-auto sm:h-9 sm:w-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Common App preview ───────────────────────────────────────────────────────

function CommonAppView({ activities }: { activities: ActivityRow[] }) {
  const sorted = [...activities].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) {
    return <p className="type-body-sm text-muted py-6 text-center">No activities to preview.</p>;
  }

  return (
    <div className="rounded-lg border border-hairline bg-canvas overflow-hidden">
      {/* Header bar mimicking Common App */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface-card px-4 py-3 sm:px-6">
        <p className="type-caption-upper text-muted" style={{ fontSize: "0.6rem" }}>Common App — Activities</p>
        <p className="type-body-sm text-muted">{sorted.length} {sorted.length === 1 ? "activity" : "activities"}</p>
      </div>

      <div className="divide-y divide-hairline">
        {sorted.map((a, i) => {
          const grades = (["grade_9","grade_10","grade_11","grade_12"] as const)
            .map((k, gi) => ({ label: ["9","10","11","12"][gi], checked: a[k] }));
          const hasTimeInfo = a.hours_per_week || a.weeks_per_year;
          const hasGrades = grades.some(g => g.checked);

          return (
            <div key={a.id} className="px-4 py-4 sm:px-6 sm:py-5">
              {/* Index + type */}
              <div className="flex items-start gap-4">
                <span className="type-caption-upper text-muted shrink-0 w-5 pt-0.5" style={{ fontSize: "0.58rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-3">

                  {/* Activity type */}
                  {a.activity_type && (
                    <div>
                      <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.58rem" }}>Activity Type</p>
                      <p className="type-body-sm text-ink">{a.activity_type}</p>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.58rem" }}>Activity Name</p>
                    <p className="text-base font-semibold text-ink">{a.name}</p>
                  </div>

                  {/* Position + org on same row */}
                  {(a.position || a.organization) && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {a.position && (
                        <div>
                          <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.58rem" }}>Position / Leadership</p>
                          <p className="type-body-sm text-ink">{a.position}</p>
                        </div>
                      )}
                      {a.organization && (
                        <div>
                          <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.58rem" }}>Organization Name</p>
                          <p className="type-body-sm text-ink">{a.organization}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {a.description && (
                    <div>
                      <p className="type-caption-upper text-muted mb-1" style={{ fontSize: "0.58rem" }}>Description</p>
                      <p className="type-body-sm text-ink leading-relaxed">{a.description}</p>
                      <p className="type-body-sm text-muted mt-0.5">{a.description.length} / 150 characters</p>
                    </div>
                  )}

                  {/* Time + grades row */}
                  {(hasTimeInfo || hasGrades || a.is_leadership || a.continued_in_college) && (
                    <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
                      {hasTimeInfo && (
                        <div>
                          <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.58rem" }}>Time Commitment</p>
                          <div className="flex gap-4">
                            {a.hours_per_week && (
                              <span className="type-body-sm text-muted"><span className="text-ink font-medium">{a.hours_per_week}</span> hrs/week</span>
                            )}
                            {a.weeks_per_year && (
                              <span className="type-body-sm text-muted"><span className="text-ink font-medium">{a.weeks_per_year}</span> weeks/year</span>
                            )}
                          </div>
                        </div>
                      )}
                      {hasGrades && (
                        <div>
                          <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.58rem" }}>Grade Levels</p>
                          <div className="flex gap-2">
                            {grades.map(g => (
                              <span
                                key={g.label}
                                className={cn(
                                  "h-7 w-7 rounded-md flex items-center justify-center type-caption border",
                                  g.checked
                                    ? "bg-primary text-on-primary border-primary"
                                    : "bg-canvas text-muted border-hairline opacity-40"
                                )}
                              >
                                {g.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-4">
                        {a.is_leadership && (
                          <div>
                            <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.58rem" }}>Leadership Role</p>
                            <span className="rounded-pill bg-primary/8 border border-primary/20 px-2.5 py-0.5 type-caption text-primary" style={{ fontSize: "0.65rem" }}>Yes</span>
                          </div>
                        )}
                        {a.continued_in_college && (
                          <div>
                            <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.58rem" }}>Continues in College</p>
                            <span className="rounded-pill bg-surface-soft border border-hairline px-2.5 py-0.5 type-caption text-muted" style={{ fontSize: "0.65rem" }}>Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivitiesTab({ activities, ctx }: { activities: ActivityRow[]; ctx: ProfileContext }) {
  const [localActivities, setLocalActivities] = useState<ActivityRow[]>(() =>
    [...activities].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ActivityForm>({ ...EMPTY_ACTIVITY_FORM });
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Sync when props change (after server revalidation)
  useEffect(() => {
    setLocalActivities([...activities].sort((a, b) => a.sort_order - b.sort_order));
  }, [activities]);

  const handleDragOver = useCallback((overId: string) => {
    if (!draggingId || overId === draggingId) return;
    setDragOverId(overId);
    setLocalActivities(prev => {
      const from = prev.findIndex(a => a.id === draggingId);
      const to = prev.findIndex(a => a.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, [draggingId]);

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    reorderActivities(localActivities.map((a, i) => ({ id: a.id, sort_order: i })));
  }

  function handleAdd() {
    if (!addForm.name.trim()) { setAddError("Activity name is required."); return; }
    startAddTransition(async () => {
      setAddError(null);
      const result = await addActivity({
        activity_type: addForm.activity_type || "Other",
        name: addForm.name,
        organization: addForm.organization,
        position: addForm.position,
        description: addForm.description,
        is_leadership: addForm.is_leadership,
        hours_per_week: addForm.hours_per_week ? Number(addForm.hours_per_week) : null,
        weeks_per_year: addForm.weeks_per_year ? Number(addForm.weeks_per_year) : null,
        grade_9: addForm.grade_9,
        grade_10: addForm.grade_10,
        grade_11: addForm.grade_11,
        grade_12: addForm.grade_12,
        continued_in_college: addForm.continued_in_college,
        status: addForm.status || "active",
      });
      if (result.error) { setAddError(result.error); return; }
      setAddForm({ ...EMPTY_ACTIVITY_FORM });
      setShowAdd(false);
    });
  }

  const hasActivities = localActivities.length > 0;
  const useModal = localActivities.length >= 1;

  function closeAdd() { setShowAdd(false); setAddForm({ ...EMPTY_ACTIVITY_FORM }); setAddError(null); }

  const addFormContent = (
    <>
      <ActivityFormFields form={addForm} setForm={setAddForm} idPrefix="add" />
      {addError && <p className="type-body-sm text-error">{addError}</p>}
      <button
        onClick={handleAdd}
        disabled={addPending || !addForm.name.trim()}
        className="h-10 w-full cursor-pointer self-start rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
      >
        {addPending ? "Adding…" : "Add activity"}
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-caption text-ink">Extracurricular activities</p>
        <div className="flex items-center gap-3">
          {hasActivities && (
            <button
              onClick={() => setShowAdd(s => !s)}
              className="inline-flex cursor-pointer items-center gap-1 self-start type-caption text-primary hover:underline sm:self-auto"
            >
              {showAdd && !useModal ? <><X className="h-3 w-3" />Cancel</> : <><Plus className="h-3 w-3" />Add</>}
            </button>
          )}
        </div>
      </div>

      {/* Empty state with inline form */}
      {!hasActivities && (
        <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
          {!showAdd ? (
            <div className="px-5 py-10 text-center">
              <p className="type-body-sm text-muted mb-3">
                {ctx.needsECs ? "Extracurriculars matter for your target schools." : "No activities added yet."}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-primary type-caption text-on-primary hover:bg-primary-active transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />Add activity
              </button>
            </div>
          ) : (
            <div className="px-5 py-5 flex flex-col gap-4">
              {addFormContent}
            </div>
          )}
        </div>
      )}

      {/* Activity cards */}
      {hasActivities && (
        <div className="flex flex-col gap-2">
          {localActivities.map(a => (
            <ActivityCard
              key={a.id}
              activity={a}
              isDragging={draggingId === a.id}
              isDragOver={dragOverId === a.id}
              onDragStart={() => setDraggingId(a.id)}
              onDragOver={() => handleDragOver(a.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => { setDraggingId(null); setDragOverId(null); }}
            />
          ))}
        </div>
      )}

      {/* Add modal — only when 1+ activities already exist */}
      {showAdd && useModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeAdd(); }}
        >
          <div className="flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-hairline bg-canvas shadow-xl sm:rounded-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3.5 sm:px-6 sm:py-4">
              <p className="type-caption text-ink">Add activity</p>
              <button onClick={closeAdd} className="h-7 w-7 flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {addFormContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HonorsTab ────────────────────────────────────────────────────────────────

const COMPETITION_GROUPS: { label: string; options: string[] }[] = [
  { label: "Mathematics", options: [
    "AMC 8", "AMC 10A", "AMC 10B", "AMC 12A", "AMC 12B",
    "AIME (American Invitational Mathematics Examination)",
    "USAMO (USA Mathematical Olympiad)", "USAJMO",
    "IMO (International Mathematical Olympiad)",
    "CEMC — Gauss", "CEMC — Cayley", "CEMC — Fermat", "CEMC — Euclid", "CEMC — CEMC",
    "HMMT (Harvard-MIT Math Tournament)", "PUMAC", "ARML", "Math League",
    "Kangaroo Mathematics", "UKMT Junior Mathematical Challenge",
    "UKMT Intermediate Mathematical Challenge", "UKMT Senior Mathematical Challenge",
    "RMO (Regional Mathematical Olympiad)", "INMO (Indian National Mathematical Olympiad)",
    "PRMO (Pre-Regional Mathematical Olympiad)", "CMO (Canadian Mathematical Olympiad)",
    "IOQM (Indian Olympiad Qualifier in Mathematics)", "BMO (British Mathematical Olympiad)",
  ]},
  { label: "Computing & Programming", options: [
    "USACO (USA Computing Olympiad)",
    "IOI (International Olympiad in Informatics)",
    "INOI (Indian National Olympiad in Informatics)",
    "IOITC", "BEBRAS Computing Challenge", "BIO (British Informatics Olympiad)",
    "Google Code Jam", "Google Kickstart", "Google Hash Code", "Facebook Hacker Cup",
    "ICPC (International Collegiate Programming Contest)", "Codeforces Round",
    "MIT Battlecode", "NACLO (Computational Linguistics Olympiad)",
    "Hack the North", "HackMIT", "TreeHacks", "HackPrinceton",
    "AP Computer Science Principles Competition", "App Development Challenge",
    "FIRST Robotics Competition (FRC)", "FIRST Tech Challenge (FTC)", "VEX Robotics",
  ]},
  { label: "Physics", options: [
    "IPhO (International Physics Olympiad)", "APhO (Asian Physics Olympiad)",
    "NSEP (National Standard Examination in Physics)",
    "IOQP (Indian Olympiad Qualifier in Physics)",
    "F=ma Exam", "USAPhO", "British Physics Olympiad (BPhO)", "Physics Bowl",
    "Science Olympiad — Experimental Design", "Science Olympiad — Physics Events",
  ]},
  { label: "Chemistry", options: [
    "IChO (International Chemistry Olympiad)", "AChO (Asian Chemistry Olympiad)",
    "NSEC (National Standard Examination in Chemistry)",
    "IOQC (Indian Olympiad Qualifier in Chemistry)",
    "USNCO (US National Chemistry Olympiad)", "British Chemistry Olympiad",
    "Science Olympiad — Chemistry Events", "Chem Olympiad Local Section",
  ]},
  { label: "Biology & Life Sciences", options: [
    "IBO (International Biology Olympiad)", "ABO (Asian Biology Olympiad)",
    "NSEB (National Standard Examination in Biology)",
    "IOQB (Indian Olympiad Qualifier in Biology)",
    "USABO (USA Biology Olympiad)", "British Biology Olympiad (BBO)",
    "Science Olympiad — Anatomy & Physiology", "Science Olympiad — Disease Detectives",
    "Science Olympiad — Ecology Events", "Regeneron Science Talent Search",
    "Intel ISEF / Regeneron ISEF", "Google Science Fair",
    "Junior Science Symposium (JSSO)", "CBSE Science Exhibition",
  ]},
  { label: "Astronomy & Earth Science", options: [
    "IOAA (International Olympiad on Astronomy & Astrophysics)",
    "NSEA (National Standard Examination in Astronomy)",
    "IOQJS (Indian Olympiad Qualifier — Junior Science)", "IESO (Earth Science Olympiad)",
    "Astronomy Olympiad", "Space Settlement Design Competition (NASA)",
    "Conrad Challenge", "Science Olympiad — Astronomy Events",
  ]},
  { label: "Engineering & Robotics", options: [
    "FIRST Robotics Competition (FRC)", "FIRST Tech Challenge (FTC)", "FIRST Lego League",
    "VEX Robotics Competition", "eCYBERMISSION", "NASA Student Launch",
    "Conrad Challenge — Engineering Track", "Engineering Olympiad", "Bridges Competition",
    "Science Olympiad — Engineering Events",
  ]},
  { label: "Debate & Public Speaking", options: [
    "Model United Nations (MUN)", "World Schools Debate",
    "British Parliamentary (BP) Debate", "Lincoln-Douglas Debate", "Public Forum Debate",
    "Policy Debate", "IPDA Debate", "Mock Trial", "Model G20",
    "MSSC Speech & Debate", "National Forensic League", "Toastmasters Youth",
  ]},
  { label: "Business & Economics", options: [
    "International Economics Olympiad (IEO)", "DECA Competition",
    "FBLA (Future Business Leaders of America)", "Hult Prize",
    "Conrad Challenge — Business Track", "Global Business Case Competition",
    "MIT Enterprise Forum Competition", "Wharton Global High School Investment Competition",
    "Economics Olympiad (Econ Olympiad)", "UPenn Economics Olympiad",
    "Business Olympiad", "Entrepreneurship Competition",
  ]},
  { label: "Social Sciences & Humanities", options: [
    "National Geography Bee / GeoBee", "Geography Olympiad",
    "History Bowl", "History Bee", "National History Day",
    "National Academic Quiz Tournaments (NAQT)", "Science Bowl",
    "Academic Decathlon", "Academic Pentathlon", "Knowledge Bowl",
    "National Social Science Symposium", "Philosophy Olympiad (IPho)",
    "Civics / Constitution Bee",
  ]},
  { label: "Literature & Writing", options: [
    "Scholastic Art & Writing Awards", "National Novel Writing Month (NaNoWriMo)",
    "Poetry Out Loud", "National Writing Project", "Young Writers Award",
    "English Speaking Union (ESU) Debate", "NCTE Writing Awards",
    "Pulitzer Center Youth Journalism", "Teen Ink Writing Contest",
    "Young Scientist Literary Award",
  ]},
  { label: "Visual Arts & Design", options: [
    "Scholastic Art Awards", "Young Arts Competition", "Doodle for Google",
    "Adobe Design Achievement Awards", "Congressional Art Competition",
    "National Art Honor Society Exhibition", "International Student Art Competition",
    "Architecture Competition", "Fashion Design Competition", "Film Festival (Student)",
  ]},
  { label: "Research & Innovation", options: [
    "Regeneron Science Talent Search (STS)", "Intel ISEF / Regeneron ISEF",
    "Junior Science and Humanities Symposia (JSHS)", "Google Science Fair",
    "MIT PRIMES", "RSI (Research Science Institute)", "NYSSEF",
    "Siemens Competition", "Davidson Fellows Scholarship",
    "CBSE National Science Exhibition", "Inspire Award — MANAK",
  ]},
  { label: "India-specific", options: [
    "NTSE (National Talent Search Examination)",
    "KVPY (Kishore Vaigyanik Protsahan Yojana)",
    "INSPIRE (DST) Award", "Olympiad HBCSE",
    "Aryabhatta Ganit Challenge", "CBSE Science Exhibition",
    "National Children's Science Congress", "National Science Olympiad (SOF)",
    "International Mathematics Olympiad (SOF)", "Cyber Olympiad (SOF)",
    "JEE Advanced (top rank)", "State Talent Search Examination",
  ]},
  { label: "Scholarships & Recognition", options: [
    "National Merit Scholarship", "Gates Scholarship", "QuestBridge Scholarship",
    "Coca-Cola Scholars", "Regeneron STAR Award", "Presidential Scholar",
    "Rotary Youth Exchange", "Fulbright Junior Exchange", "Chevening Scholarship",
    "Commonwealth Scholarship", "DAAD Scholarship", "Erasmus+ Scholarship",
    "Rhodes Scholarship (Candidate)", "Marshall Scholarship (Candidate)",
  ]},
  { label: "Other", options: ["OTHER"] },
];

const HONOR_FIELD_OPTIONS = [
  { value: "Mathematics", label: "Mathematics" },
  { value: "Computing & Technology", label: "Computing & Technology" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Biology & Life Sciences", label: "Biology & Life Sciences" },
  { value: "Astronomy & Space", label: "Astronomy & Space" },
  { value: "Earth & Environmental Science", label: "Earth & Environmental Science" },
  { value: "Engineering & Robotics", label: "Engineering & Robotics" },
  { value: "Research & Innovation", label: "Research & Innovation" },
  { value: "Economics & Finance", label: "Economics & Finance" },
  { value: "Business & Entrepreneurship", label: "Business & Entrepreneurship" },
  { value: "Social Sciences", label: "Social Sciences" },
  { value: "History & Civics", label: "History & Civics" },
  { value: "Geography", label: "Geography" },
  { value: "Debate & Public Speaking", label: "Debate & Public Speaking" },
  { value: "Literature & Writing", label: "Literature & Writing" },
  { value: "Visual Arts & Design", label: "Visual Arts & Design" },
  { value: "Music & Performing Arts", label: "Music & Performing Arts" },
  { value: "Language & Linguistics", label: "Language & Linguistics" },
  { value: "Law & Policy", label: "Law & Policy" },
  { value: "Medicine & Health Sciences", label: "Medicine & Health Sciences" },
  { value: "Community Service & Leadership", label: "Community Service & Leadership" },
  { value: "Sports & Athletics", label: "Sports & Athletics" },
  { value: "Other", label: "Other" },
];

const HONOR_LEVEL_OPTIONS = [
  { value: "school", label: "School" },
  { value: "district", label: "District / City" },
  { value: "state", label: "State / Regional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const HONOR_RECOGNITION_OPTIONS = [
  { value: "school", label: "School" },
  { value: "state/regional", label: "State / Regional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const HONOR_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "participated", label: "Participated" },
  { value: "placed", label: "Placed" },
  { value: "won", label: "Won / Selected" },
];

const HONOR_STATUS_STYLES: Record<string, string> = {
  planned: "bg-warning/10 text-warning",
  participated: "bg-ink/8 text-muted",
  placed: "bg-primary/10 text-primary",
  won: "bg-success/10 text-success",
};

const HONOR_GRADE_OPTIONS = ["9", "10", "11", "12"];

type HonorForm = {
  title: string;
  field: string;
  issuing_org: string;
  level: string;
  recognition_level: string;
  year: string;
  grade: string;
  status: string;
  award: string;
  description: string;
};

const EMPTY_HONOR_FORM: HonorForm = {
  title: "",
  field: "",
  issuing_org: "",
  level: "",
  recognition_level: "",
  year: "",
  grade: "",
  status: "participated",
  award: "",
  description: "",
};

function honorToForm(h: HonorRow): HonorForm {
  return {
    title: h.title,
    field: h.field ?? "",
    issuing_org: h.issuing_org ?? "",
    level: h.level ?? "",
    recognition_level: h.recognition_level ?? "",
    year: h.year ?? "",
    grade: h.grade ?? "",
    status: h.status ?? "participated",
    award: h.award ?? "",
    description: h.description ?? "",
  };
}

// Competition name input with grouped autocomplete
function CompetitionNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();

  const query = value.trim().toLowerCase();
  const filteredGroups = query
    ? COMPETITION_GROUPS.map(g => ({
        ...g,
        options: g.options.filter(o => o.toLowerCase().includes(query)),
      })).filter(g => g.options.length > 0)
    : COMPETITION_GROUPS;

  return (
    <div ref={anchorRef} className="relative">
      <input
        type="text"
        value={value}
        autoComplete="off"
        placeholder="e.g. AMC 10A, IMO, Science Olympiad…"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); }}
        className={inputCls}
      />
      <AnchoredDropdownPanel open={open} rect={rect} menuRef={menuRef} minWidth={320} className="max-h-72 overflow-y-auto py-1">
        {filteredGroups.map(g => (
          <div key={g.label}>
            <p className="px-3 pt-2 pb-1 type-caption-upper text-muted" style={{ fontSize: "0.55rem" }}>{g.label}</p>
            {g.options.map(o => (
              <button
                key={o}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(o); close(); }}
                className={cn(
                  "w-full text-left px-4 py-2 type-body-sm transition-colors cursor-pointer",
                  o === value ? "text-primary bg-primary/5 font-medium" : "text-ink hover:bg-surface-soft"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-2 type-body-sm text-muted">No matches — your entry will be used as-is</p>
        )}
      </AnchoredDropdownPanel>
    </div>
  );
}

function HonorFormFields({ form, setForm, idPrefix }: {
  form: HonorForm;
  setForm: (fn: (f: HonorForm) => HonorForm) => void;
  idPrefix: string;
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = String(currentYear - 8 + i);
    return { value: y, label: y };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Competition / Honor Name *</label>
        <CompetitionNameInput value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Field */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Field / Domain</label>
          <CustomDropdown
            value={form.field}
            onChange={v => setForm(f => ({ ...f, field: v }))}
            options={HONOR_FIELD_OPTIONS}
            placeholder="Select field…"
          />
        </div>

        {/* Status */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Status</label>
          <CustomDropdown
            value={form.status}
            onChange={v => setForm(f => ({ ...f, status: v }))}
            options={HONOR_STATUS_OPTIONS}
          />
        </div>

        {/* Level */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Level</label>
          <CustomDropdown
            value={form.level}
            onChange={v => {
              const map: Record<string, string> = {
                school: "school", district: "state/regional",
                state: "state/regional", national: "national", international: "international",
              };
              setForm(f => ({ ...f, level: v, recognition_level: map[v] ?? f.recognition_level }));
            }}
            options={HONOR_LEVEL_OPTIONS}
            placeholder="Select level…"
          />
        </div>

        {/* Award */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Award / Result</label>
          <input
            type="text"
            value={form.award}
            onChange={e => setForm(f => ({ ...f, award: e.target.value }))}
            placeholder="e.g. 1st Place, Gold Medal, Finalist"
            className={inputCls}
          />
        </div>

        {/* Issuing org */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Organised by</label>
          <input
            type="text"
            value={form.issuing_org}
            onChange={e => setForm(f => ({ ...f, issuing_org: e.target.value }))}
            placeholder="e.g. MAA, CBSE, Google"
            className={inputCls}
          />
        </div>

        {/* Year */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Year</label>
          <CustomDropdown
            value={form.year}
            onChange={v => setForm(f => ({ ...f, year: v }))}
            options={yearOptions}
            placeholder="Select year…"
          />
        </div>

        {/* Grade */}
        <div>
          <label className="type-caption-upper text-muted mb-1.5 block" style={{ fontSize: "0.6rem" }}>Grade</label>
          <div className="flex gap-1.5">
            {HONOR_GRADE_OPTIONS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setForm(f => ({ ...f, grade: f.grade === g ? "" : g }))}
                className={cn(
                  "h-9 w-10 rounded-md type-caption border transition-colors cursor-pointer",
                  form.grade === g
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-canvas text-body border-hairline hover:border-primary/30"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="type-caption-upper text-muted" style={{ fontSize: "0.6rem" }}>Description (optional)</label>
          <span className="type-body-sm text-muted">{form.description.length}/200</span>
        </div>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 200) }))}
          placeholder="Briefly describe what you did and any recognition received"
          rows={2}
          className={cn(inputCls, "h-auto py-2 resize-none")}
        />
      </div>
    </div>
  );
}

// Per-honor card with inline expand/edit
function HonorCard({
  honor,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  honor: HonorRow;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<HonorForm>(() => honorToForm(honor));
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(honorToForm(honor)));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fresh = honorToForm(honor);
    const freshStr = JSON.stringify(fresh);
    if (freshStr !== snapshot) {
      setForm(fresh);
      setSnapshot(freshStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [honor]);

  const isDirty = JSON.stringify(form) !== snapshot;

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await updateHonor(honor.id, form);
      if (result.error) { setError(result.error); return; }
      setSnapshot(JSON.stringify(form));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDelete() {
    setDeleting(true);
    startTransition(async () => {
      await deleteHonor(honor.id);
    });
  }

  const statusStyle = HONOR_STATUS_STYLES[honor.status ?? "participated"] ?? "bg-surface-soft text-muted";
  const statusLabel = HONOR_STATUS_OPTIONS.find(o => o.value === (honor.status ?? "participated"))?.label ?? honor.status;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border bg-surface-card overflow-hidden transition-all duration-150",
        isDragging ? "opacity-40 scale-[0.99] border-primary/30 shadow-none" : "border-hairline",
        isDragOver && !isDragging ? "border-primary/50 shadow-sm" : "",
      )}
    >
      {/* Collapsed header */}
      <div className="flex flex-wrap items-start gap-2 py-4 pl-2 pr-3 sm:items-center sm:gap-4 sm:py-5 sm:pl-3 sm:pr-5">
        <div
          className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-muted transition-colors hover:text-ink active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer text-left"
          onClick={() => setExpanded(e => !e)}
        >
          <p className="text-base font-semibold leading-tight text-ink">
            {honor.title || <span className="font-normal italic text-muted">Untitled</span>}
          </p>

          {(honor.issuing_org || honor.field) && (
            <p className="type-body-sm text-body mt-2">
              {[honor.field, honor.issuing_org].filter(Boolean).join(" · ")}
            </p>
          )}

          {honor.award && (
            <p className="type-body-sm text-muted mt-1">{honor.award}</p>
          )}

          <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {honor.level && (
              <span className="type-body-sm text-muted">
                Level <span className="text-ink font-medium capitalize">{honor.level}</span>
              </span>
            )}
            {(honor.year || honor.grade) && (
              <span className="type-body-sm text-muted">
                {[honor.grade ? `Grade ${honor.grade}` : null, honor.year].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </button>

        {honor.status && (
          <span className={cn("rounded-pill px-2.5 py-0.5 type-caption shrink-0", statusStyle)} style={{ fontSize: "0.65rem" }}>
            {statusLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="h-6 w-6 flex items-center justify-center text-muted hover:text-ink transition-colors shrink-0 cursor-pointer"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="flex flex-col gap-4 border-t border-hairline bg-surface-soft px-4 py-4 sm:px-5 sm:py-5">
          <HonorFormFields form={form} setForm={setForm} idPrefix={honor.id} />
          {error && <p className="type-body-sm text-error">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
              >
                {saved ? <><Check className="h-3.5 w-3.5" />Saved</> : isPending ? "Saving…" : "Save changes"}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting || isPending}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-error/30 px-4 type-caption text-error transition-colors hover:bg-error/5 disabled:opacity-40 sm:ml-auto sm:h-9 sm:w-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HonorsTab({ honors }: { honors: HonorRow[] }) {
  const [localHonors, setLocalHonors] = useState<HonorRow[]>(() =>
    [...honors].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<HonorForm>({ ...EMPTY_HONOR_FORM });
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    setLocalHonors([...honors].sort((a, b) => a.sort_order - b.sort_order));
  }, [honors]);

  const handleDragOver = useCallback((overId: string) => {
    if (!draggingId || overId === draggingId) return;
    setDragOverId(overId);
    setLocalHonors(prev => {
      const from = prev.findIndex(h => h.id === draggingId);
      const to = prev.findIndex(h => h.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, [draggingId]);

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    reorderHonors(localHonors.map((h, i) => ({ id: h.id, sort_order: i })));
  }

  function handleAdd() {
    if (!addForm.title.trim()) { setAddError("Competition or honor name is required."); return; }
    startAddTransition(async () => {
      setAddError(null);
      const result = await addHonor(addForm);
      if (result.error) { setAddError(result.error); return; }
      setAddForm({ ...EMPTY_HONOR_FORM });
      setShowAdd(false);
    });
  }

  const hasHonors = localHonors.length > 0;
  const useModal = localHonors.length >= 1;
  function closeAdd() { setShowAdd(false); setAddForm({ ...EMPTY_HONOR_FORM }); setAddError(null); }

  const addFormContent = (
    <>
      <HonorFormFields form={addForm} setForm={setAddForm} idPrefix="add-honor" />
      {addError && <p className="type-body-sm text-error">{addError}</p>}
      <button
        onClick={handleAdd}
        disabled={addPending || !addForm.title.trim()}
        className="h-10 w-full cursor-pointer self-start rounded-md bg-primary px-5 type-caption text-on-primary transition-colors hover:bg-primary-active disabled:opacity-40 sm:h-9 sm:w-auto"
      >
        {addPending ? "Adding…" : "Add honor"}
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-caption text-ink">Competitions & Honors</p>
        {hasHonors && (
          <button
            onClick={() => setShowAdd(s => !s)}
            className="inline-flex cursor-pointer items-center gap-1 self-start type-caption text-primary hover:underline sm:self-auto"
          >
            {showAdd && !useModal ? <><X className="h-3 w-3" />Cancel</> : <><Plus className="h-3 w-3" />Add</>}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasHonors && (
        <div className="rounded-lg border border-hairline bg-surface-card overflow-hidden">
          {!showAdd ? (
            <div className="px-5 py-10 text-center">
              <p className="type-body-sm text-muted mb-3">
                Add competitions, olympiads, awards, and academic honors.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-primary type-caption text-on-primary hover:bg-primary-active transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />Add honor
              </button>
            </div>
          ) : (
            <div className="px-5 py-5 flex flex-col gap-4">
              {addFormContent}
            </div>
          )}
        </div>
      )}

      {/* Honor cards */}
      {hasHonors && (
        <div className="flex flex-col gap-2">
          {localHonors.map(h => (
            <HonorCard
              key={h.id}
              honor={h}
              isDragging={draggingId === h.id}
              isDragOver={dragOverId === h.id}
              onDragStart={() => setDraggingId(h.id)}
              onDragOver={() => handleDragOver(h.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => { setDraggingId(null); setDragOverId(null); }}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && useModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeAdd(); }}
        >
          <div className="flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-hairline bg-canvas shadow-xl sm:rounded-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3.5 sm:px-6 sm:py-4">
              <p className="type-caption text-ink">Add competition or honor</p>
              <button onClick={closeAdd} className="flex h-7 w-7 cursor-pointer items-center justify-center text-muted transition-colors hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {addFormContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProfileClient (main export) ─────────────────────────────────────────────

export function ProfileClient({
  section: initialSection,
  profile,
  testScores,
  activities,
  honors,
  ctx,
  displayName,
  displayCycle,
}: {
  section: ProfileSectionSlug;
  profile: ProfileData | null;
  testScores: TestScoreRow[];
  activities: ActivityRow[];
  honors: HonorRow[];
  ctx: ProfileContext;
  displayName: string | null;
  displayCycle: string | null;
}) {
  const [section, setSection] = useState(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    function onPopState() {
      const slug = window.location.pathname.split("/").pop() ?? "";
      if (isProfileSectionSlug(slug)) setSection(slug);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function selectSection(slug: ProfileSectionSlug) {
    setSection(slug);
    window.history.replaceState(null, "", `/profile/${slug}`);
  }

  const activeTab = tabForSlug(section);
  
  return (
    <div className="animate-premium-reveal">
      <ProfileTabNav section={section} onSelect={selectSection} />

      <div key={activeTab} className="animate-premium-tab-reveal">
        {activeTab === "personal" && (
          <PersonalInformationTab
            profile={profile}
            ctx={ctx}
            displayName={displayName}
            displayCycle={displayCycle}
          />
        )}
        {activeTab === "academics" && <AcademicsTab profile={profile} ctx={ctx} />}
        {activeTab === "tests" && <TestsTab testScores={testScores} />}
        {activeTab === "activities" && <ActivitiesTab activities={activities} ctx={ctx} />}
        {activeTab === "honors" && <HonorsTab honors={honors} />}
      </div>
    </div>
  );
}
