"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const ease = [0.21, 0.47, 0.32, 0.98] as const;

// Sources:
// 93% — CBSE / education press, widely cited re: CBSE 2026 counsellor mandate
// 10% — Bharat Career Aspirations Report 2025 (UN-backed, n=4,968, 25 states) via Deccan Herald
// 60× — Higher Education Digest: India needs ~1.5M counsellors, has ~25,000
const stats = [
  {
    prefix: "",
    value: 93,
    suffix: "%",
    label: "Schools have no counsellor",
    context: "Over 93% of Indian schools have no professional guidance counsellor on staff.",
  },
  {
    prefix: "",
    value: 10,
    suffix: "%",
    label: "Students get expert guidance",
    context: "Only 1 in 10 students in Classes 9–12 has access to expert career counselling.",
    source: "Bharat Career Aspirations Report 2025",
  },
  {
    prefix: "",
    value: 60,
    suffix: "×",
    label: "Counsellor shortfall",
    context: "India needs 1.5 million counsellors. It has roughly 25,000.",
    source: "Higher Education Digest",
  },
];

function CountUp({
  target,
  duration = 1800,
  prefix = "",
  suffix = "",
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number | null = null;

    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };

    requestAnimationFrame(tick);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export function ProblemSection() {
  return (
    <section className="py-section px-6 border-b border-hairline">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease }}
          className="mb-14"
        >
          <p className="type-caption-upper text-muted mb-4">The problem</p>
          <h2 className="type-display-md text-ink max-w-xl">
            9 in 10 students apply<br />to college completely alone.
          </h2>
          <p className="type-body-md text-muted mt-4 max-w-md leading-relaxed">
            The guidance gap in India is enormous — and it directly affects outcomes.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 32, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.13 }}
              className="group relative overflow-hidden rounded-xl border border-hairline bg-canvas p-8 hover:border-primary/40 hover:bg-surface-soft transition-all duration-300"
            >
              {/* Animated top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
              />

              {/* Number */}
              <p
                className="text-ink mb-4 group-hover:text-primary transition-colors duration-300"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.75rem, 5vw, 4rem)",
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: "-0.07rem",
                }}
              >
                <CountUp
                  target={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  duration={1600 + i * 200}
                />
              </p>

              <p className="type-title-sm text-ink mb-2">{s.label}</p>
              <p className="type-body-sm text-muted leading-relaxed">{s.context}</p>
              {"source" in s && (
                <p className="type-caption text-muted-soft mt-4 pt-4 border-t border-hairline-soft">
                  {s.source}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Resolution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease, delay: 0.45 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <p className="type-body-md text-muted max-w-lg leading-relaxed">
            Counselly closes that gap — AI-powered guidance, personalised to every student, at no cost.
          </p>
          <span className="hidden sm:block h-px flex-1 bg-hairline" />
          <span className="text-primary text-xl shrink-0" style={{ fontFamily: "var(--font-display)" }} aria-hidden>
            ✦
          </span>
        </motion.div>

      </div>
    </section>
  );
}
