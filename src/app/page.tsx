import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, UserCircle, Compass, CheckCircle2 } from "lucide-react";
import { SapientiaMark } from "@/components/brand/sapientia-mark";
import { Nav } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/ui/motion";
import { DashboardMockup } from "@/components/ui/dashboard-mockup";
import { UniversityCarousel } from "@/components/ui/university-carousel";
import { ProblemSection } from "@/components/sections/problem-section";
import { FeaturesSection } from "@/components/sections/features-section";

/* ─── Data ──────────────────────────────────────────────── */

const steps = [
  {
    Icon: UserCircle,
    n: "01",
    title: "Build your profile",
    body: "Tell Sapientia who you are — your grades, interests, schools you're eyeing, and what matters to you.",
  },
  {
    Icon: Compass,
    n: "02",
    title: "Get your roadmap",
    body: "Receive a personalised plan: college list, application timeline, essay prompts, and scholarships — all tailored to you.",
  },
  {
    Icon: CheckCircle2,
    n: "03",
    title: "Apply with confidence",
    body: "Work through every task with your AI counsellor by your side, from first draft to final submission.",
  },
];

const stats = [
  { value: "500+",  label: "Colleges in our database" },
  { value: "Free",  label: "No cost, no credit card" },
  { value: "AI-first", label: "Built for students" },
];

const revealDelay = (delay: string) => ({ "--reveal-delay": delay }) as CSSProperties;

/* ─── Page ──────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      <Nav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-20 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-x-24 xl:gap-x-32 lg:gap-y-0 items-center min-h-[82vh]">

            {/* Left: copy — capped width so headline aligns cleanly vs. mockup */}
            <div className="flex flex-col justify-center w-full min-w-0 lg:max-w-xl xl:max-w-2xl">
              <div className="hero-reveal flex items-center gap-2.5 mb-10" style={revealDelay("80ms")}>
                <span className="text-primary select-none" style={{ fontSize: "0.9rem" }} aria-hidden>✦</span>
                <span className="type-caption-upper text-muted tracking-widest">AI-powered college counselling</span>
              </div>

              <h1 className="type-display-hero text-ink mb-0">
                <span className="hero-word" style={revealDelay("180ms")}>The counsellor</span><br />
                <em className="hero-word not-italic" style={{ color: "var(--color-primary)", ...revealDelay("300ms") }}>every student</em><br />
                <span className="hero-word" style={revealDelay("420ms")}>deserves.</span>
              </h1>

              <div className="hero-reveal mt-10 pt-10 border-t border-hairline" style={revealDelay("560ms")}>
                <p className="type-body-md text-body max-w-xs leading-relaxed mb-8">
                  Tell us where you want to go.<br />
                  We&apos;ll show you exactly how to get there.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/auth"
                    className="group subtle-sheen inline-flex items-center gap-2.5 px-8 font-medium font-sans rounded-md bg-primary text-on-primary hover:bg-primary-active transition-all duration-200 overflow-hidden"
                    style={{ height: "3.25rem", fontSize: "1rem" }}
                  >
                    Start for free
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#features"
                    className="premium-lift inline-flex items-center gap-2 px-8 font-medium font-sans rounded-md bg-canvas text-ink border border-hairline hover:bg-surface-soft transition-all duration-200"
                    style={{ height: "3.25rem", fontSize: "1rem" }}
                  >
                    See how it works
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-14 flex gap-10">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className="hero-reveal-soft"
                    style={revealDelay(`${720 + i * 90}ms`)}
                  >
                    <p className="type-display-sm text-ink">{s.value}</p>
                    <p className="type-body-sm text-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: product mockup — right-aligned in column for balance with left rail */}
            <div className="hidden lg:flex lg:items-center lg:justify-end w-full min-w-0">
              <div className="hero-visual relative w-full max-w-lg xl:max-w-xl">
                <DashboardMockup />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── University carousel ──────────────────────────── */}
      <UniversityCarousel />

      <ProblemSection />

      <FeaturesSection />

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-section px-6 bg-surface-soft border-y border-hairline overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="type-caption-upper text-muted mb-3">How it works</p>
            <h2 className="type-display-md text-ink mb-16 max-w-md">
              From profile to acceptance,<br />step by step.
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.15}>
                <div
                  className="group relative flex flex-col rounded-xl bg-canvas border border-hairline p-8 overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
                  style={{ minHeight: "20rem" }}
                >
                  {/* Number watermark — peeks from bottom-right corner */}
                  <span
                    className="absolute leading-none select-none pointer-events-none font-display"
                    style={{
                      fontSize: "9rem",
                      fontWeight: 700,
                      bottom: "-0.5rem",
                      right: "1.5rem",
                      color: "var(--color-ink)",
                      opacity: 0.055,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {s.n}
                  </span>

                  {/* Icon — top left */}
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-full bg-surface-soft border border-hairline flex items-center justify-center transition-all duration-300 group-hover:bg-primary/8 group-hover:border-primary/20">
                      <s.Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Arrow connector (desktop only) */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-[2.75rem] -right-3 z-10">
                      <ArrowRight className="w-4 h-4 text-muted-soft" strokeWidth={1.5} />
                    </div>
                  )}

                  <h3
                    className="text-ink mb-3"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.35rem, 2vw, 1.6rem)",
                      fontWeight: 500,
                      lineHeight: 1.2,
                      letterSpacing: "-0.02rem",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p className="type-body-sm text-body leading-relaxed max-w-[22ch]">{s.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product card ─────────────────────────────────── */}
      {/* ── Final CTA ────────────────────────────────────── */}
      <section id="pricing" className="bg-canvas py-section px-6 pb-10">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="premium-lift relative overflow-hidden rounded-2xl border border-hairline bg-surface-card px-8 py-20 text-center sm:rounded-3xl sm:px-14 hover:border-primary/30">
              <SapientiaMark className="relative z-[1] mx-auto mb-7 h-14 w-auto opacity-20" decorative />
              <h2 className="type-display-lg relative z-[1] mb-4 text-ink">
                Your counsellor is waiting.
              </h2>
              <p className="relative z-[1] mx-auto mb-10 max-w-md type-body-md leading-relaxed text-body">
                Join students across India getting the edge they deserve — at no cost.
              </p>
              <Link
                href="/auth"
                className="group subtle-sheen relative z-[1] inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-pill bg-primary px-10 text-base font-medium text-on-primary shadow-[0_14px_36px_color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition-all duration-200 hover:bg-primary-active"
              >
                Get started for free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <p className="relative z-[1] mt-6 type-caption text-muted">
                Always free · Built for India
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
