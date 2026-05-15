import Link from "next/link";
import { SapientiaMark } from "@/components/brand/sapientia-mark";
import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const validModes = new Set<AuthMode>(["login", "signup", "forgot", "reset"]);

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMode(value: string | string[] | undefined): AuthMode {
  const mode = readParam(value);
  return mode && validModes.has(mode as AuthMode) ? (mode as AuthMode) : "login";
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mode = getMode(params.mode);
  const nextPath = readParam(params.next) || "/";
  const configured = Boolean(getSupabaseEnv());
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="min-h-screen bg-canvas px-6 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <SapientiaMark className="h-6" decorative />
            <span className="font-display text-[1.25rem] font-[400] tracking-tight text-ink">
              Sapientia
            </span>
          </Link>
          <Link
            href="/"
            className="type-nav rounded-md px-3 py-2 text-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            Home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:py-16">
          <div className="max-w-2xl">
            <p className="type-caption-upper mb-4 text-muted">Sapientia account</p>
            <h2 className="type-display-xl mb-6 text-ink">
              Your admissions plan should remember you.
            </h2>
            <p className="type-body-md max-w-xl text-body">
              Save your profile, shortlist, deadlines, essay work, scholarships, and counsellor
              conversations in one calm workspace.
            </p>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { item: "Profile", meta: "12 details" },
                { item: "Roadmap", meta: "18 tasks" },
                { item: "Essays", meta: "4 drafts" },
              ].map(({ item, meta }) => (
                <div
                  key={item}
                  className="rounded-lg border border-hairline bg-surface-soft px-4 py-4"
                >
                  <p className="type-caption text-ink">{item}</p>
                  <p className="mt-1 type-caption text-muted-soft">{meta}</p>
                  <div className="mt-3 h-1.5 rounded-pill bg-surface-cream-strong">
                    <div className="h-full w-2/3 rounded-pill bg-primary" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-xl rounded-lg bg-surface-card p-5">
              <p className="type-caption text-ink">Lerno users can use the same account.</p>
              <p className="mt-2 type-body-sm text-body">
                Sapientia connects to the existing Supabase auth pool and stores Sapientia-specific
                data separately.
              </p>
            </div>
          </div>

          <AuthPanel
            initialMode={mode}
            initialMessage={readParam(params.message)}
            initialError={readParam(params.error)}
            nextPath={nextPath}
            userEmail={user?.email}
            configured={configured}
          />
        </section>
      </div>
    </main>
  );
}
