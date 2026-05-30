import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Nav } from "@/components/layout/nav";

/* ─── Animation delay helper (CSS var trick from homepage) ── */
const d = (delay: string) => ({ "--reveal-delay": delay }) as CSSProperties;

/* ─── Features ───────────────────────────────────────────── */
const features = [
  "Personalised college list",
  "Application timeline & tracker",
  "Essay guidance & brainstorming",
  "Unlimited AI counsellor chat",
  "Scholarship discovery",
  "Profile & extracurricular advice",
];

/* ─── Page ──────────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <div className="flex flex-col" style={{ minHeight: "100svh" }}>
      <Nav />

      {/* ── Full-viewport content ──────────────────────────── */}
      <main
        className="flex flex-1 items-center px-6"
        style={{ minHeight: "calc(100svh - 6rem)" }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 items-center">

            {/* ── Left: pitch ─────────────────────────────── */}
            <div>

              {/* Badge */}
              <div
                className="hero-reveal mb-8 inline-flex items-center gap-2.5 rounded-pill border border-primary/25 px-4 py-2 shadow-sm"
                style={{
                  ...d("60ms"),
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 7%, var(--color-canvas)) 0%, var(--color-canvas) 100%)",
                }}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-success opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-success/20" />
                </span>
                <span className="type-caption font-medium text-ink">Early access · Limited time offer</span>
              </div>

              {/* Headline */}
              <h1
                className="hero-reveal text-ink mb-2"
                style={{
                  ...d("140ms"),
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3.25rem, 8vw, 5rem)",
                  fontWeight: 500,
                  lineHeight: 0.97,
                  letterSpacing: "-0.1rem",
                }}
              >
                Completely
                <br />
                <em
                  className="not-italic"
                  style={{ color: "var(--color-primary)" }}
                >
                  free.
                </em>
              </h1>

              {/* Price display */}
              <div className="hero-reveal mt-7 flex items-end gap-3" style={d("240ms")}>
                <span
                  className="text-ink leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(4rem, 11vw, 5.75rem)",
                    fontWeight: 500,
                    letterSpacing: "-0.08rem",
                    lineHeight: 1,
                  }}
                >
                  ₹0
                </span>
                <div className="mb-1.5 flex flex-col gap-0.5">
                  <span className="type-body-sm text-muted line-through">₹2–5 lakh / yr</span>
                  <span className="type-caption text-muted">per month</span>
                </div>
              </div>

              {/* Urgency note */}
              <div className="hero-reveal mt-5 flex items-start gap-2" style={d("320ms")}>
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-soft" strokeWidth={1.75} />
                <p className="type-body-sm text-muted max-w-xs leading-relaxed">
                  Free during early access. We&rsquo;ll give plenty of notice before pricing changes — early users will be rewarded.
                </p>
              </div>

              {/* CTA */}
              <div className="hero-reveal mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={d("400ms")}>
                <Link
                  href="/auth"
                  className="group subtle-sheen inline-flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-pill bg-primary px-9 text-base font-medium text-on-primary shadow-[0_10px_32px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition-all duration-200 hover:bg-primary-active hover:-translate-y-0.5 hover:shadow-[0_14px_40px_color-mix(in_srgb,var(--color-primary)_38%,transparent)]"
                >
                  Get free access
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <p className="type-caption text-muted pl-1 sm:pl-0">
                  No credit card &middot; No hidden fees
                </p>
              </div>
            </div>

            {/* ── Right: feature card ─────────────────────── */}
            <div className="hero-reveal-soft" style={d("180ms")}>
              <div
                className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "var(--color-canvas)",
                  border: "1px solid var(--color-hairline)",
                  boxShadow: "0 1px 2px rgba(20,20,19,0.04), 0 8px 32px rgba(20,20,19,0.07), 0 24px 56px rgba(20,20,19,0.05)",
                }}
              >
                {/* Soft primary wash top-right — very subtle */}
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-[0.07] blur-3xl"
                  style={{ background: "var(--color-primary)" }}
                  aria-hidden
                />

                <div className="relative z-10 p-8">

                  {/* Header */}
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="type-caption-upper text-muted mb-1">What&rsquo;s included</p>
                      <p
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.5rem, 2.5vw, 1.85rem)",
                          fontWeight: 500,
                          lineHeight: 1.15,
                          letterSpacing: "-0.03rem",
                          color: "var(--color-ink)",
                        }}
                      >
                        Everything.<br />Unlocked.
                      </p>
                    </div>
                    <span
                      className="type-caption-upper shrink-0 rounded-pill px-3 py-1.5"
                      style={{
                        background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-canvas))",
                        color: "var(--color-primary)",
                        border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                        fontWeight: 600,
                      }}
                    >
                      Free
                    </span>
                  </div>

                  {/* Feature list */}
                  <ul className="flex flex-col mb-6" style={{ gap: "2px" }}>
                    {features.map((label, i) => (
                      <li
                        key={label}
                        className="mockup-enter flex items-center gap-3 rounded-lg px-3 py-2.5"
                        style={{ "--mockup-delay": `${300 + i * 55}ms` } as CSSProperties}
                      >
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-canvas))",
                            border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                          }}
                        >
                          <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
                        </span>
                        <span className="type-body-sm font-medium text-body-strong">{label}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Comparison footer */}
                  <div
                    className="rounded-xl px-5 py-4"
                    style={{
                      background: "var(--color-surface-soft)",
                      border: "1px solid var(--color-hairline)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="type-caption text-muted mb-0.5">Traditional counsellor</p>
                        <p
                          className="text-muted"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.2rem",
                            fontWeight: 500,
                            letterSpacing: "-0.02rem",
                            textDecoration: "line-through",
                            opacity: 0.55,
                          }}
                        >
                          ₹2–5 lakh / yr
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-soft" strokeWidth={1.5} />
                      <div className="text-right">
                        <p className="type-caption text-primary mb-0.5">Counselly today</p>
                        <p
                          className="text-primary"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.2rem",
                            fontWeight: 500,
                            letterSpacing: "-0.02rem",
                          }}
                        >
                          ₹0 / yr
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
