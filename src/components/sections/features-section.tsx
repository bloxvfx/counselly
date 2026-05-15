"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { CheckCircle2, Circle, MessageSquare, Send, Award, IndianRupee, CalendarCheck } from "lucide-react";

const ease = [0.21, 0.47, 0.32, 0.98] as const;

/* ─── Feature Visuals ───────────────────────────────────── */

function RoadmapVisual() {
  const milestones = [
    { date: "Aug 2025", task: "JEE Advanced result review",       done: true  },
    { date: "Sep 2025", task: "BITS Pilani HD form opens",         done: true  },
    { date: "Oct 2025", task: "Common App essays — first draft",   done: false, active: true },
    { date: "Nov 2025", task: "Submit teacher recommendations",    done: false },
    { date: "Dec 2025", task: "UT Austin early action deadline",   done: false },
    { date: "Jan 2026", task: "Final document submission",         done: false },
  ];

  return (
    <div className="w-full rounded-xl border border-hairline bg-canvas overflow-hidden">
      <div className="bg-surface-soft px-5 py-3.5 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          <span className="text-ink text-xs font-medium">Application Roadmap</span>
        </div>
        <span className="text-muted-soft text-xs">6 milestones</span>
      </div>
      <div className="p-2">
        {milestones.map((m, i) => (
          <motion.div
            key={m.task}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease }}
            className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-colors ${m.active ? "bg-primary/6" : "hover:bg-surface-soft"}`}
          >
            <div className="mt-0.5 shrink-0">
              {m.done
                ? <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={2} />
                : <Circle className={`w-4 h-4 ${m.active ? "text-primary" : "text-hairline"}`} strokeWidth={2} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${m.done ? "text-muted line-through" : m.active ? "text-ink" : "text-body"}`}>
                {m.task}
              </p>
              {m.active && (
                <p className="text-primary text-[11px] mt-0.5 font-medium">In progress — due in 3 weeks</p>
              )}
            </div>
            <span className="text-muted-soft text-[11px] shrink-0">{m.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CollegeListVisual() {
  const colleges = [
    { name: "IIT Bombay",        branch: "Computer Science",       tag: "Reach", fit: 74, flag: "🇮🇳" },
    { name: "BITS Pilani",       branch: "CS & Economics",         tag: "Match", fit: 89, flag: "🇮🇳" },
    { name: "UT Austin",         branch: "Computer Science",       tag: "Reach", fit: 71, flag: "🇺🇸" },
    { name: "U of Toronto",      branch: "CS",                     tag: "Match", fit: 84, flag: "🇨🇦" },
    { name: "Ashoka University", branch: "Economics & Mathematics", tag: "Safe",  fit: 96, flag: "🇮🇳" },
  ];

  const tagColor: Record<string, string> = {
    Reach: "bg-accent-amber/10 text-accent-amber",
    Match: "bg-primary/10 text-primary",
    Safe:  "bg-success/10 text-success",
  };

  return (
    <div className="w-full rounded-xl border border-hairline bg-canvas overflow-hidden">
      <div className="bg-surface-soft px-5 py-3.5 border-b border-hairline flex items-center justify-between">
        <span className="text-ink text-xs font-medium">My College List</span>
        <span className="text-primary text-xs font-medium">5 colleges · Balanced</span>
      </div>
      <div className="divide-y divide-hairline-soft">
        {colleges.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-soft transition-colors"
          >
            <span className="text-base shrink-0">{c.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-xs font-medium truncate">{c.name}</p>
              <p className="text-muted-soft text-[11px]">{c.branch}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-ink text-xs font-medium">{c.fit}%</p>
                <p className="text-muted-soft text-[10px]">fit</p>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${tagColor[c.tag]}`}>
                {c.tag}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EssayVisual() {
  const annotations = [
    { type: "suggestion", text: "Open with a specific moment — admissions readers need to see the scene immediately." },
    { type: "warning",    text: "Avoid 'journey' — it's one of the most overused words in college essays." },
  ];

  return (
    <div className="w-full rounded-xl border border-hairline bg-canvas overflow-hidden">
      <div className="bg-surface-soft px-5 py-3.5 border-b border-hairline flex items-center justify-between">
        <span className="text-ink text-xs font-medium">Common App — Prompt 1</span>
        <span className="bg-accent-amber/10 text-accent-amber text-[11px] font-medium px-2.5 py-1 rounded-full">Draft</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="relative">
          <p className="text-body text-xs leading-relaxed border-l-2 border-primary/30 pl-3">
            My journey into mathematics began when I was twelve, sitting in my father&apos;s
            study surrounded by engineering textbooks I couldn&apos;t yet read. The equations
            felt like a secret language — one I was determined to decode.
          </p>
        </div>
        <div className="space-y-2">
          {annotations.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease }}
              className={`flex items-start gap-2.5 rounded-lg p-3 text-xs leading-relaxed ${
                a.type === "suggestion"
                  ? "bg-primary/6 text-body border border-primary/15"
                  : "bg-accent-amber/6 text-body border border-accent-amber/15"
              }`}
            >
              <span className="mt-0.5 shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 500 }}>✦</span>
              {a.text}
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="h-1.5 rounded-full bg-surface-card flex-1 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "38%" }}
              transition={{ delay: 0.6, duration: 0.8, ease }}
            />
          </div>
          <span className="text-muted-soft text-[11px]">38% complete</span>
        </div>
      </div>
    </div>
  );
}

function ProfileVisual() {
  const strengths = [
    { label: "JEE Advanced score",   value: 98.2, unit: "%ile", good: true },
    { label: "Research internship",  value: null, good: true,   text: "IISc, Summer 2024" },
    { label: "Olympiad medals",      value: null, good: true,   text: "3 national medals" },
  ];
  const gaps = [
    { label: "Leadership role",  tip: "Join a club exec position or start one" },
    { label: "Community impact", tip: "Document your tutoring work as measurable impact" },
  ];

  return (
    <div className="w-full rounded-xl border border-hairline bg-canvas overflow-hidden">
      <div className="bg-surface-soft px-5 py-3.5 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          <span className="text-ink text-xs font-medium">Profile Strength</span>
        </div>
        <span className="text-primary text-xs font-semibold">72 / 100</span>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <div className="flex justify-between text-[11px] text-muted mb-1.5">
            <span>Overall</span><span>Strong</span>
          </div>
          <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "72%" }}
              transition={{ delay: 0.3, duration: 0.9, ease }}
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] text-muted uppercase tracking-widest mb-2.5">Strengths</p>
          {strengths.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" strokeWidth={2} />
              <span className="text-ink text-xs flex-1">{s.label}</span>
              <span className="text-muted-soft text-[11px]">{s.text ?? `${s.value}${s.unit}`}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[11px] text-muted uppercase tracking-widest mb-2.5">To strengthen</p>
          {gaps.map((g) => (
            <div key={g.label} className="flex items-start gap-2.5 py-1.5">
              <Circle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-ink text-xs">{g.label}</p>
                <p className="text-muted-soft text-[11px] mt-0.5">{g.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScholarshipsVisual() {
  const scholarships = [
    { name: "Tata Capital Pankh Scholarship", amount: "₹2,00,000", deadline: "Dec 15", match: 94 },
    { name: "ONGC Foundation Scholarship",    amount: "₹1,50,000", deadline: "Jan 10", match: 88 },
    { name: "Aditya Birla Scholarship",       amount: "₹1,00,000", deadline: "Nov 30", match: 79 },
  ];

  return (
    <div className="w-full space-y-3">
      {scholarships.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.45, ease }}
          className="rounded-xl border border-hairline bg-canvas p-5 hover:border-primary/30 hover:bg-surface-soft transition-all duration-200 group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-ink text-xs font-medium leading-snug mb-1.5">{s.name}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-success" strokeWidth={2} />
                  <span className="text-success text-xs font-semibold">{s.amount}</span>
                </div>
                <span className="text-muted-soft text-[11px]">Due {s.deadline}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-primary text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>{s.match}%</p>
              <p className="text-muted-soft text-[10px]">match</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ChatVisual() {
  const messages = [
    {
      role: "user",
      text: "Should I apply to BITS Pilani or IIIT Hyderabad for CS?",
    },
    {
      role: "ai",
      text: "Based on your profile, here's my take — BITS Pilani gives you stronger placement networks and global exposure. IIIT Hyderabad is better if research or startups are your goal. Given your internship at IISc, I'd lean BITS for industry, IIIT-H if you're eyeing a PhD.",
    },
    {
      role: "user",
      text: "What about cost? My family has budget concerns.",
    },
    {
      role: "ai",
      text: "IIIT Hyderabad fees are significantly lower (~₹2L/yr vs ₹4.5L at BITS). I've also found 3 scholarships you're eligible for — want me to add them to your list?",
    },
  ];

  return (
    <div className="w-full rounded-xl border border-hairline bg-canvas overflow-hidden">
      <div className="bg-surface-soft px-5 py-3.5 border-b border-hairline flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
        <span className="text-ink text-xs font-medium">Ask Sapientia</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-success" />
      </div>
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto" data-lenis-prevent>
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.4, ease }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ai" && (
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                <span className="text-primary text-[9px]">✦</span>
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-on-primary rounded-tr-sm"
                  : "bg-surface-soft text-body border border-hairline-soft rounded-tl-sm"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-soft px-3 py-2.5">
          <input
            readOnly
            placeholder="Ask anything about your applications..."
            className="flex-1 bg-transparent text-xs text-muted outline-none placeholder:text-muted-soft"
          />
          <Send className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

/* ─── Feature definitions ───────────────────────────────── */

const features = [
  {
    n: "01",
    title: "Personalised roadmap",
    description:
      "A step-by-step application timeline built around your exact profile, target colleges, and deadlines. Every task has a due date. Nothing gets missed.",
    Visual: RoadmapVisual,
  },
  {
    n: "02",
    title: "College list that fits you",
    description:
      "A balanced reach, match, and safety list based on your academics, interests, and ambitions. Indian and global options, ranked by fit — not prestige.",
    Visual: CollegeListVisual,
  },
  {
    n: "03",
    title: "Essay guidance & review",
    description:
      "Brainstorm, outline, and draft every essay with real-time AI feedback. Sapientia flags clichés, weak openings, and missed opportunities — just like a human counsellor would.",
    Visual: EssayVisual,
  },
  {
    n: "04",
    title: "Profile-building strategy",
    description:
      "Know exactly what's strengthening your application and what's missing. Concrete, actionable steps — not vague advice about being 'well-rounded'.",
    Visual: ProfileVisual,
  },
  {
    n: "05",
    title: "Scholarships matched to you",
    description:
      "Discover scholarships you actually qualify for, with deadlines and eligibility clearly laid out. No more hunting across twenty websites.",
    Visual: ScholarshipsVisual,
  },
  {
    n: "06",
    title: "Ask anything, get real answers",
    description:
      "Have a question at 11pm before a deadline? Ask Sapientia. It knows your profile, your colleges, and your timeline — so answers are specific to you, not generic advice.",
    Visual: ChatVisual,
  },
];

/* ─── Active tracker ────────────────────────────────────── */

function FeatureTracker({
  index,
  onActive,
  children,
}: {
  index: number;
  onActive: (i: number) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-40% 0px -50% 0px" });

  useEffect(() => {
    if (isInView) onActive(index);
  }, [isInView, index, onActive]);

  return <div ref={ref}>{children}</div>;
}

/* ─── Main component ────────────────────────────────────── */

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const onActive = useCallback((i: number) => setActive(i), []);

  const ActiveVisual = features[active].Visual;

  return (
    <section id="features" className="py-section px-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
          className="mb-20"
        >
          <p className="type-caption-upper text-muted mb-4">What Sapientia does</p>
          <h2 className="type-display-md text-ink max-w-xl">
            Everything a counsellor does,<br />available to everyone.
          </h2>
        </motion.div>

        {/* Sticky scroll layout — no items-start so right col stretches to left col height */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-20">

          {/* Left: scrollable feature list */}
          <div className="pb-[30vh]">
            {features.map((f, i) => (
              <FeatureTracker key={f.n} index={i} onActive={onActive}>
                <div className={`py-16 border-t transition-colors duration-500 cursor-default ${
                  i === active ? "border-primary/70" : "border-hairline"
                }`}>
                  <div className="flex items-start gap-5">
                    <span
                      className="shrink-0 mt-1 transition-colors duration-300"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        letterSpacing: "0.06rem",
                        color: i === active ? "var(--color-primary)" : "var(--color-muted-soft)",
                      }}
                    >
                      {f.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.2rem, 1.8vw, 1.55rem)",
                          fontWeight: 500,
                          lineHeight: 1.2,
                          letterSpacing: "-0.02rem",
                          color: i === active ? "var(--color-ink)" : "var(--color-muted-soft)",
                          opacity: i === active ? 1 : 0.55,
                          transition: "color 0.35s ease, opacity 0.35s ease",
                        }}
                      >
                        {f.title}
                      </h3>
                      <AnimatePresence initial={false}>
                        {i === active && (
                          <motion.p
                            key="desc"
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: "0.75rem" }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.38, ease }}
                            className="type-body-sm text-body leading-relaxed overflow-hidden"
                          >
                            {f.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </FeatureTracker>
            ))}
            <div className="border-t border-hairline" />
          </div>

          {/* Right: grid item wrapper (stretches to left col height) → inner element is what sticks */}
          <div>
            <div className="sticky top-[50vh] -translate-y-1/2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.4, ease }}
                >
                  <ActiveVisual />
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mt-5 justify-center">
                {features.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === active ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-hairline"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="lg:hidden space-y-10">
          {features.map((f) => (
            <div key={f.n} className="space-y-5">
              <div>
                <span className="type-caption-upper text-primary">{f.n}</span>
                <h3 className="type-display-sm text-ink mt-1 mb-2">{f.title}</h3>
                <p className="type-body-sm text-body leading-relaxed">{f.description}</p>
              </div>
              <f.Visual />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
