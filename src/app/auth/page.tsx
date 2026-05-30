import Link from "next/link";
import type { CSSProperties } from "react";
import { CounsellyMark, CounsellyText } from "@/components/brand/counselly-mark";
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
    <main className="h-screen overflow-hidden bg-canvas flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 xl:px-10">

        {/* Nav */}
        <header className="flex h-24 shrink-0 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <CounsellyMark className="h-9 transition-opacity group-hover:opacity-60" decorative />
            <CounsellyText className="h-[16px] w-auto transition-opacity group-hover:opacity-60" />
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

        {/* Two-column body — vertically centred, fills remaining height */}
        <div className="grid flex-1 min-h-0 items-center lg:grid-cols-[minmax(0,28rem)_24rem] lg:gap-20 xl:grid-cols-[minmax(0,32rem)_28rem] xl:gap-24 justify-center">

          {/* ── Left ── */}
          <div className="hidden min-w-0 overflow-visible lg:flex lg:flex-col gap-8">

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
          <div className="hero-reveal-soft min-w-0 w-full" style={d("80ms")}>
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
