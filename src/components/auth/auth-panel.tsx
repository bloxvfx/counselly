"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot" | "reset";

interface AuthPanelProps {
  initialMode: AuthMode;
  initialMessage?: string;
  initialError?: string;
  nextPath: string;
  userEmail?: string;
  configured: boolean;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function AuthPanel({
  initialMode, initialMessage, initialError,
  nextPath, userEmail, configured,
}: AuthPanelProps) {
  const router    = useRouter();
  const emailId   = useId();
  const pwId      = useId();
  const confirmId = useId();

  const [mode,            setMode]            = useState<AuthMode>(initialMode);
  const [email,           setEmail]           = useState(userEmail ?? "");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(
    initialError   ? { kind: "error", text: initialError   } :
    initialMessage ? { kind: "ok",    text: initialMessage } : null
  );
  const [pending, setPending] = useState(false);

  const isMeta  = mode === "forgot" || mode === "reset";
  const pwOk    = password.length >= 8;
  const pwHint  = useMemo(() => {
    if (mode === "forgot" || password.length === 0) return "";
    return pwOk ? "Looks good." : "At least 8 characters.";
  }, [mode, password.length, pwOk]);

  function switchMode(next: AuthMode) {
    setMode(next); setNotice(null);
    setPassword(""); setConfirmPassword("");
    router.replace(`/auth?mode=${next}`, { scroll: false });
  }

  async function handleGoogle() {
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    if (!configured)                                 return setNotice({ kind: "error", text: "Supabase is not configured yet." });
    if (mode !== "reset"  && !email.trim())          return setNotice({ kind: "error", text: "Enter your email address." });
    if (mode !== "forgot" && password.length < 8)   return setNotice({ kind: "error", text: "Password must be at least 8 characters." });
    if (mode === "reset"  && password !== confirmPassword) return setNotice({ kind: "error", text: "Passwords don't match." });

    setPending(true);
    try {
      const sb = createClient();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return setNotice({ kind: "error", text: error.message });
        router.push(nextPath); router.refresh();
      }
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) return setNotice({ kind: "error", text: error.message });
        if (data.session) { router.push("/onboarding"); router.refresh(); return; }
        setNotice({ kind: "ok", text: "Check your email to confirm your account." });
      }
      if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/auth?mode=reset")}`,
        });
        if (error) return setNotice({ kind: "error", text: error.message });
        setNotice({ kind: "ok", text: "Reset link sent — check your inbox." });
      }
      if (mode === "reset") {
        const { error } = await sb.auth.updateUser({ password });
        if (error) return setNotice({ kind: "error", text: error.message });
        setPassword(""); setConfirmPassword("");
        setNotice({ kind: "ok", text: "Password updated. You're all set." });
      }
    } finally { setPending(false); }
  }

  /* Already signed in */
  if (Boolean(userEmail) && mode !== "reset") {
    return (
      <Panel>
        <p className="type-caption-upper text-primary mb-3">Signed in</p>
        <h2 className="type-display-sm text-ink mb-1.5">You&apos;re already in.</h2>
        <p className="type-body-sm text-muted mb-6">
          Signed in as <span className="font-medium text-ink">{userEmail}</span>.
        </p>
        <Link href={nextPath} className={btnPrimary}>Continue to Sapientia</Link>
        <form action="/auth/signout" method="post" className="mt-2.5">
          <button type="submit" className={btnGhost}>Sign out</button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel>
      {/* Tab switcher — login / signup only */}
      {!isMeta && (
        <div className="relative mb-6 flex rounded-lg bg-surface-soft p-1">
          <motion.div
            className="absolute inset-y-1 rounded-md bg-canvas shadow-[0_1px_3px_rgba(20,20,19,0.09)]"
            style={{ width: "calc(50% - 4px)" }}
            animate={{ x: mode === "signup" ? "calc(100% + 4px)" : "0%" }}
            transition={{ duration: 0.24, ease }}
          />
          {(["login", "signup"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => switchMode(tab)}
              className={cn(
                "relative z-10 flex-1 h-9 rounded-md type-caption transition-colors duration-200",
                mode === tab ? "text-ink" : "text-muted hover:text-body",
              )}>
              {tab === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
      )}

      {/* Heading — animates when mode changes */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode + "-heading"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease } }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.16, ease } }}
          className="mb-5"
        >
          <h1 className="type-display-sm text-ink mb-1">
            {mode === "login"  && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "reset"  && "Choose a new password"}
          </h1>
          <p className="type-body-sm text-muted">
            {mode === "login"  && "Sign in to your Sapientia workspace."}
            {mode === "signup" && "Join students planning smarter admissions."}
            {mode === "forgot" && "We'll send a secure link to your inbox."}
            {mode === "reset"  && "Use a password you don't use elsewhere."}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div key={notice.text}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.16 } }}
            className={cn(
              "overflow-hidden rounded-lg border px-4 py-3 type-body-sm",
              notice.kind === "error"
                ? "border-error/25 bg-error/5 text-ink"
                : "border-success/25 bg-success/5 text-ink",
            )}
            role="status" aria-live="polite"
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form fields — animate when mode changes */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.form key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease } }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.16, ease } }}
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
        >
          {mode !== "reset" && (
            <Field id={emailId} label="Email">
              <Input id={emailId} type="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" disabled={pending} />
            </Field>
          )}

          {mode !== "forgot" && (
            <Field id={pwId} label="Password" hint={pwHint} hintOk={pwOk}>
              <Input id={pwId} type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8+ characters" disabled={pending} />
            </Field>
          )}

          {mode === "reset" && (
            <Field id={confirmId} label="Confirm password">
              <Input id={confirmId} type="password" autoComplete="new-password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Same password again" disabled={pending} />
            </Field>
          )}

          {mode === "login" && (
            <div className="-mt-1 text-right">
              <button type="button" onClick={() => switchMode("forgot")}
                className="type-caption text-muted transition-colors hover:text-primary">
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={pending} className={cn(btnPrimary, "mt-1")}>
            <AnimatePresence mode="wait">
              {pending
                ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2"><Spinner />Working…</motion.span>
                : <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {mode === "login"  && "Sign in"}
                    {mode === "signup" && "Create account"}
                    {mode === "forgot" && "Send reset link"}
                    {mode === "reset"  && "Update password"}
                  </motion.span>
              }
            </AnimatePresence>
          </button>

          {!isMeta && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-hairline" />
                <span className="type-caption text-muted-soft">or</span>
                <div className="h-px flex-1 bg-hairline" />
              </div>
              <button type="button" disabled={pending} onClick={handleGoogle}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-hairline bg-canvas type-caption text-body transition-all duration-200 hover:bg-surface-soft hover:border-primary/25 active:scale-[0.98] disabled:opacity-50">
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}
        </motion.form>
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-6 text-center">
        {!isMeta && (
          <p className="type-body-sm text-muted">
            {mode === "login"
              ? <>No account?{" "}<button type="button" onClick={() => switchMode("signup")} className="text-primary hover:underline">Sign up free</button></>
              : <>Have an account?{" "}<button type="button" onClick={() => switchMode("login")} className="text-primary hover:underline">Sign in</button></>
            }
          </p>
        )}
        {isMeta && (
          <button type="button" onClick={() => switchMode("login")}
            className="type-body-sm text-muted hover:text-primary transition-colors">
            ← Back to sign in
          </button>
        )}
      </div>
    </Panel>
  );
}

/* ── Shared primitives ── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.46, ease: [0.21, 0.47, 0.32, 0.98] } }}
      className="w-full rounded-xl border border-hairline bg-canvas px-8 py-8 shadow-[0_4px_24px_rgba(20,20,19,0.07)]"
    >
      {children}
    </motion.div>
  );
}

function Field({ id, label, hint, hintOk, children }: {
  id: string; label: string; hint?: string; hintOk?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-caption text-body">{label}</label>
      {children}
      <AnimatePresence>
        {hint && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { duration: 0.18 } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
            className={cn("type-caption overflow-hidden", hintOk ? "text-success" : "text-muted")}
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={cn(
      "h-11 w-full rounded-lg border border-hairline bg-surface-soft px-3.5",
      "type-body-sm text-ink outline-none placeholder:text-muted-soft",
      "transition-all duration-200",
      "focus:border-primary focus:bg-canvas focus:ring-3 focus:ring-primary/12",
      "disabled:opacity-50",
      className,
    )} />
  );
}

const btnPrimary =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary type-caption text-on-primary transition-all duration-200 hover:bg-primary-active active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

const btnGhost =
  "inline-flex h-11 w-full items-center justify-center rounded-lg border border-hairline type-caption text-muted transition-all duration-200 hover:bg-surface-soft hover:text-ink active:scale-[0.98]";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
