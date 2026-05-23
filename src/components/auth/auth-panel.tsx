"use client";

import { type FormEvent, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getUnmetPasswordRules, validateEmail } from "@/lib/auth-validation";

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
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

function getSiteOrigin() {
  return configuredSiteUrl || window.location.origin;
}

function getAuthCallbackUrl(next?: string) {
  const url = new URL("/auth/callback", getSiteOrigin());
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

function isEmailSendRateLimit(error: { code?: string; message?: string }) {
  return (
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    /rate limit/i.test(error.message ?? "")
  );
}

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
  const [pwTouched, setPwTouched] = useState(false);

  const isMeta       = mode === "forgot" || mode === "reset";
  const needsPwRules = mode === "signup" || mode === "reset";
  const pwErrors     = pwTouched && needsPwRules
    ? getUnmetPasswordRules(password).map((r) => r.label)
    : [];

  function switchMode(next: AuthMode) {
    setMode(next); setNotice(null); setPwTouched(false);
    setPassword(""); setConfirmPassword("");
    router.replace(`/auth?mode=${next}`, { scroll: false });
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (pwTouched && needsPwRules && getUnmetPasswordRules(value).length === 0) {
      setPwTouched(false);
    }
  }

  async function handleGoogle() {
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl(nextPath) },
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    if (!configured) return setNotice({ kind: "error", text: "Supabase is not configured yet." });

    if (mode !== "reset") {
      const emailErr = validateEmail(email);
      if (emailErr) return setNotice({ kind: "error", text: emailErr });
    }

    if (mode !== "forgot") {
      if (mode === "login" && !password) {
        return setNotice({ kind: "error", text: "Enter your password." });
      }
      if (needsPwRules) {
        const unmet = getUnmetPasswordRules(password);
        if (unmet.length > 0) {
          setPwTouched(true);
          return;
        }
      } else if (password.length < 8) {
        return setNotice({ kind: "error", text: "Password must be at least 8 characters." });
      }
    }

    if (mode === "reset" && password !== confirmPassword) {
      return setNotice({ kind: "error", text: "Passwords don't match." });
    }

    setPending(true);
    try {
      const sb = createClient();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return setNotice({ kind: "error", text: error.message });
        router.push(nextPath); router.refresh();
      }
      if (mode === "signup") {
        const trimmedEmail = email.trim();
        const signInUrl = getAuthCallbackUrl(nextPath);
        const { error: existingAccountError } = await sb.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: signInUrl,
            shouldCreateUser: false,
          },
        });

        if (!existingAccountError) {
          setPassword("");
          setConfirmPassword("");
          setNotice({
            kind: "ok",
            text: "You already have an account. We sent a sign-in link to your email.",
          });
          return;
        }

        if (isEmailSendRateLimit(existingAccountError)) {
          return setNotice({
            kind: "error",
            text: "Email sending is temporarily rate limited. Please wait a minute and try again.",
          });
        }

        const { data, error } = await sb.auth.signUp({
          email: trimmedEmail, password,
          options: { emailRedirectTo: getAuthCallbackUrl("/onboarding") },
        });
        if (error) return setNotice({ kind: "error", text: error.message });
        if (data.session) { router.push("/onboarding"); router.refresh(); return; }
        setNotice({ kind: "ok", text: "Check your email to confirm your account." });
      }
      if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getAuthCallbackUrl("/auth?mode=reset"),
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
                "relative z-10 flex-1 h-9 cursor-pointer rounded-md type-caption transition-colors duration-200",
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
              "overflow-hidden rounded-lg border-2 px-4 py-3.5 type-body-sm font-medium",
              notice.kind === "error"
                ? "border-error bg-error/22 text-ink"
                : "border-success bg-success/22 text-ink",
            )}
            role={notice.kind === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            <span className="flex items-start gap-2.5">
              <NoticeIcon kind={notice.kind === "error" ? "error" : "ok"} />
              <span>{notice.text}</span>
            </span>
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
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                title="Use a valid email like you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={pending}
              />
            </Field>
          )}

          {mode !== "forgot" && (
            <Field id={pwId} label="Password">
              <Input
                id={pwId}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={needsPwRules ? 8 : 1}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={needsPwRules ? "Create a strong password" : "Your password"}
                disabled={pending}
                aria-invalid={pwErrors.length > 0}
                aria-describedby={pwErrors.length > 0 ? `${pwId}-errors` : undefined}
              />
              {pwErrors.length > 0 && (
                <ul id={`${pwId}-errors`} className="flex flex-col gap-0.5" role="alert">
                  {pwErrors.map((label) => (
                    <li key={label} className="type-caption text-error">
                      {label}
                    </li>
                  ))}
                </ul>
              )}
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
                className="cursor-pointer type-caption text-muted transition-colors hover:text-primary">
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
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-hairline bg-canvas type-caption text-body transition-all duration-200 hover:bg-surface-soft hover:border-primary/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}
        </motion.form>
      </AnimatePresence>

      {isMeta && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => switchMode("login")}
            className="cursor-pointer type-body-sm text-muted transition-colors hover:text-primary">
            ← Back to sign in
          </button>
        </div>
      )}
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

function Field({ id, label, children }: {
  id: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-caption text-body">{label}</label>
      {children}
    </div>
  );
}

function NoticeIcon({ kind }: { kind: "error" | "ok" }) {
  return (
    <svg
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0",
        kind === "error" ? "text-error" : "text-success",
      )}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      {kind === "error" ? (
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      )}
    </svg>
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
  "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-primary type-caption text-on-primary transition-all duration-200 hover:bg-primary-active active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

const btnGhost =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-hairline type-caption text-muted transition-all duration-200 hover:bg-surface-soft hover:text-ink active:scale-[0.98]";

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
