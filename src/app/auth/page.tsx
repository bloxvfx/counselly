import Link from "next/link";
import type { CSSProperties } from "react";
import { SapientiaMark } from "@/components/brand/sapientia-mark";
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

const FEATURES = [
  { label: "College list",      detail: "Match · Reach · Safety" },
  { label: "Essay workspace",   detail: "AI-assisted drafts"     },
  { label: "Deadlines",         detail: "Never miss a date"      },
  { label: "Scholarships",      detail: "India-specific funding" },
];

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params    = await searchParams;
  const mode      = getMode(params.mode);
  const nextPath  = readParam(params.next) || "/dashboard";
  const configured = Boolean(getSupabaseEnv());
  const supabase  = await createClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 xl:px-10">

        {/* Nav */}
        <header className="flex h-16 shrink-0 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <SapientiaMark className="h-6 transition-opacity group-hover:opacity-60" decorative />
            <span className="font-display text-[1.25rem] font-[400] tracking-tight text-ink">
              Sapientia
            </span>
          </Link>
          <Link href="/" className="type-nav text-muted transition-colors hover:text-ink">
            ← Home
          </Link>
        </header>

        {/* Two-column body */}
        <div className="grid flex-1 items-center pb-16 pt-6 lg:grid-cols-[minmax(0,26rem)_22rem] lg:gap-14 xl:grid-cols-[minmax(0,30rem)_24rem] xl:gap-16 justify-center">

          {/* ── Left: marketing ── */}
          <div className="hidden min-w-0 lg:flex lg:flex-col">
            <div className="hero-reveal mb-7 flex items-center gap-2" style={d("60ms")}>
              <span className="text-primary" aria-hidden style={{ fontSize: "0.8rem" }}>✦</span>
              <span className="type-caption-upper text-muted">Your personal college counsellor</span>
            </div>

            {/* Each line is a div so block display is guaranteed (hero-word uses inline-block) */}
            <h1 className="mb-6" style={{ lineHeight: 0.97 }}>
              <div className="hero-word type-display-xl text-ink"  style={{ display: "block", ...d("120ms") }}>Your admissions</div>
              <div className="hero-word type-display-xl"           style={{ display: "block", color: "var(--color-primary)", ...d("240ms") }}>plan remembers</div>
              <div className="hero-word type-display-xl text-ink"  style={{ display: "block", ...d("360ms") }}>you.</div>
            </h1>

            <p className="hero-reveal type-body-md text-body leading-relaxed mb-8" style={d("460ms")}>
              Build your profile once. Sapientia turns it into a college list,
              essay prompts, deadlines, and scholarship matches — all tailored to you.
            </p>

            <div className="hero-reveal grid grid-cols-2 gap-2 mb-6" style={d("540ms")}>
              {FEATURES.map((f) => (
                <div key={f.label}
                  className="rounded-lg border border-hairline bg-surface-soft px-3.5 py-3 transition-colors hover:bg-surface-card">
                  <p className="type-caption text-ink">{f.label}</p>
                  <p className="mt-0.5 text-muted-soft" style={{ fontSize: "0.7rem", fontWeight: 500 }}>{f.detail}</p>
                </div>
              ))}
            </div>

            <div className="hero-reveal flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3" style={d("620ms")}>
              <span className="text-primary shrink-0 mt-px" aria-hidden style={{ fontSize: "0.8rem" }}>✦</span>
              <div>
                <p className="type-caption text-ink">Already on Lerno?</p>
                <p className="mt-0.5 type-body-sm text-muted">Same account — no new signup needed.</p>
              </div>
            </div>
          </div>

          {/* ── Right: panel ── */}
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
