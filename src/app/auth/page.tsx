import Link from "next/link";
import type { CSSProperties } from "react";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

type AuthMode = "login" | "signup" | "forgot" | "reset";
const validModes = new Set<AuthMode>(["login", "signup", "forgot", "reset"]);

function readParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
function getMode(v: string | string[] | undefined): AuthMode {
  const m = readParam(v);
  return m && validModes.has(m as AuthMode) ? (m as AuthMode) : "login";
}

const d = (ms: string) => ({ "--reveal-delay": ms }) as CSSProperties;

const OUTCOMES = [
  { label: "College list",   detail: "Match · Reach · Safety" },
  { label: "Essays",         detail: "AI-guided, your voice"  },
  { label: "Deadlines",      detail: "Zero missed dates"      },
];

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params      = await searchParams;
  const mode        = getMode(params.mode);
  const nextPath    = readParam(params.next) || "/dashboard";
  const configured  = Boolean(getSupabaseEnv());
  const supabase    = await createClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <main className="flex min-h-svh flex-col bg-canvas lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:h-full xl:px-10">

        {/* Nav */}
        <header className="flex h-16 shrink-0 items-center justify-between lg:h-24">
          <Link href="/" className={`flex items-center ${counsellyLogoLockupClass} group`}>
            <CounsellyMark className="h-7 transition-opacity group-hover:opacity-60" decorative />
            <CounsellyText className="h-[18px] w-auto transition-opacity group-hover:opacity-60" />
          </Link>
          <Link
            href="/"
            className="type-caption text-muted transition-colors hover:text-ink flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Home
          </Link>
        </header>

        {/* Two-column body — vertically centred on desktop */}
        <div className="grid flex-1 min-h-0 items-center justify-center gap-8 py-6 sm:gap-10 sm:py-8 lg:grid-cols-[minmax(0,28rem)_24rem] lg:gap-20 lg:py-0 xl:grid-cols-[minmax(0,32rem)_28rem] xl:gap-24">

          {/* ── Mobile / tablet pitch (desktop uses left column below) ── */}
          <div className="min-w-0 space-y-5 lg:hidden">
            <div className="hero-reveal flex items-center gap-2.5" style={d("60ms")}>
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span className="type-caption-upper text-muted">Built for Indian students</span>
            </div>
            <h1 className="hero-reveal type-display-md text-ink" style={d("120ms")}>
              Get into the college{" "}
              <span style={{ color: "var(--color-primary)" }}>you want.</span>
            </h1>
            <div className="hero-reveal flex flex-col rounded-xl border border-hairline bg-surface-soft/60" style={d("200ms")}>
              {OUTCOMES.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${i < OUTCOMES.length - 1 ? "border-b border-hairline" : ""}`}
                >
                  <span className="type-caption text-ink">{item.label}</span>
                  <span className="type-caption text-right text-muted">{item.detail}</span>
                </div>
              ))}
            </div>
            <p className="hero-reveal type-body-sm text-muted" style={d("280ms")}>
              <span className="font-medium text-ink">Already on Lerno?</span> Same account.
            </p>
          </div>

          {/* ── Left (desktop) ── */}
          <div className="hidden min-w-0 overflow-visible lg:flex lg:flex-col lg:gap-8">

            {/* Eyebrow */}
            <div className="hero-reveal flex items-center gap-2.5" style={d("60ms")}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />
              <span className="type-caption-upper text-muted">Built for Indian students</span>
            </div>

            {/* Headline — wider than column so copy stays on two lines */}
            <div className="w-max max-w-none">
              <h1 style={{ lineHeight: 0.95 }}>
                <div className="hero-word type-display-xl text-ink whitespace-nowrap"  style={{ display: "block", ...d("120ms") }}>Get into the college</div>
                <div className="hero-word type-display-xl whitespace-nowrap"           style={{ display: "block", color: "var(--color-primary)", ...d("240ms") }}>you want.</div>
              </h1>
            </div>

            {/* Outcome rows */}
            <div className="hero-reveal flex flex-col" style={d("460ms")}>
              {OUTCOMES.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between py-3 ${i < OUTCOMES.length - 1 ? "border-b border-hairline" : ""}`}
                >
                  <span className="type-caption text-ink">{item.label}</span>
                  <span className="type-caption text-muted">{item.detail}</span>
                </div>
              ))}
            </div>

            {/* Lerno */}
            <p className="hero-reveal type-body-sm text-muted" style={d("560ms")}>
              <span className="font-medium text-ink">Already on Lerno?</span>{" "}Same account.
            </p>
          </div>

          {/* ── Right: auth panel ── */}
          <div className="hero-reveal-soft mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:max-w-none" style={d("80ms")}>
            <AuthPanel
              initialMode={mode}
              initialMessage={readParam(params.message)}
              initialError={readParam(params.error)}
              nextPath={nextPath}
              userEmail={user?.email}
              configured={configured}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
