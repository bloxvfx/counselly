"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const authCopy: Record<
  AuthMode,
  { eyebrow: string; title: string; body: string; action: string }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to Sapientia",
    body: "Pick up your college roadmap, essays, shortlist, and counsellor chat where you left off.",
    action: "Sign in",
  },
  signup: {
    eyebrow: "Start your plan",
    title: "Create your Sapientia account",
    body: "Build a profile once, then let Sapientia turn it into a clear admissions plan.",
    action: "Create account",
  },
  forgot: {
    eyebrow: "Password help",
    title: "Reset your password",
    body: "Enter your account email and we will send a secure reset link.",
    action: "Send reset link",
  },
  reset: {
    eyebrow: "New password",
    title: "Choose a new password",
    body: "Use a password you do not use anywhere else.",
    action: "Update password",
  },
};

function getModeHref(mode: AuthMode) {
  return `/auth?mode=${mode}`;
}

export function AuthPanel({
  initialMode,
  initialMessage,
  initialError,
  nextPath,
  userEmail,
  configured,
}: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(initialMessage ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);

  const copy = authCopy[mode];
  const isSignedIn = Boolean(userEmail);
  const showAccountState = isSignedIn && mode !== "reset";

  const passwordHint = useMemo(() => {
    if (mode === "forgot") {
      return "";
    }

    if (password.length === 0) {
      return "Use at least 8 characters.";
    }

    return password.length >= 8 ? "Password length looks good." : "Password is too short.";
  }, [mode, password.length]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setStatus("");
    setPassword("");
    setConfirmPassword("");
    router.replace(getModeHref(nextMode), { scroll: false });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!configured) {
      setError("Supabase is not configured yet. Add the public URL and anon key.");
      return;
    }

    if (!email.trim() && mode !== "reset") {
      setError("Enter your email address.");
      return;
    }

    if (mode !== "forgot" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (mode === "reset" && password !== confirmPassword) {
      setError("Both passwords must match.");
      return;
    }

    setPending(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(nextPath);
        router.refresh();
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }

        setStatus("Check your email to confirm your account.");
      }

      if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          "/auth?mode=reset",
        )}`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setStatus("Password reset link sent. Check your email.");
      }

      if (mode === "reset") {
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setPassword("");
        setConfirmPassword("");
        setStatus("Password updated. You can continue to Sapientia.");
      }
    } finally {
      setPending(false);
    }
  }

  if (showAccountState) {
    return (
      <div className="w-full max-w-md rounded-lg border border-hairline bg-canvas p-8">
        <Badge variant="coral" className="mb-5 type-caption-upper">
          Signed in
        </Badge>
        <h1 className="type-display-md mb-3 text-ink">You are already in.</h1>
        <p className="type-body-sm mb-8 text-muted">
          Signed in as <span className="text-ink">{userEmail}</span>.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={nextPath}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-active"
          >
            Continue
          </Link>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="lg" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-canvas">
      <div className="border-b border-hairline bg-surface-soft px-6 py-5">
        <Badge variant="coral" className="mb-4 type-caption-upper">
          {copy.eyebrow}
        </Badge>

        <h1 className="type-display-md mb-2 text-ink">{copy.title}</h1>
        <p className="type-body-sm text-muted">{copy.body}</p>
      </div>

      <div className="border-b border-hairline px-6 py-3">
        <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-soft p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={cn(
                "h-9 rounded-sm type-caption transition-colors",
                mode === item
                  ? "bg-canvas text-ink shadow-sm"
                  : "text-muted hover:bg-surface-card hover:text-body",
              )}
            >
              {item === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
      </div>

      {!configured && (
        <div className="mx-6 mt-6 rounded-md border border-warning/40 bg-surface-soft px-4 py-3 type-body-sm text-muted">
          Add <span className="font-medium text-ink">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-medium text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to
          enable live auth.
        </div>
      )}

      {(error || status) && (
        <div
          className={cn(
            "mx-6 mt-6 rounded-md border px-4 py-3 type-body-sm",
            error
              ? "border-error/40 bg-error/5 text-ink"
              : "border-success/40 bg-success/5 text-ink",
          )}
          role="status"
          aria-live="polite"
        >
          {error || status}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-6">
        {mode !== "reset" && (
          <label className="flex flex-col gap-2">
            <span className="type-caption text-body">Email address</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="h-12 rounded-md border border-hairline bg-canvas px-4 type-body-md text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-4 focus:ring-primary/20"
              placeholder="you@example.com"
              disabled={pending}
            />
          </label>
        )}

        {mode !== "forgot" && (
          <label className="flex flex-col gap-2">
            <span className="type-caption text-body">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-12 rounded-md border border-hairline bg-canvas px-4 type-body-md text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-4 focus:ring-primary/20"
              placeholder="8+ characters"
              disabled={pending}
            />
            {passwordHint && (
              <span className="type-caption text-muted">{passwordHint}</span>
            )}
          </label>
        )}

        {mode === "reset" && (
          <label className="flex flex-col gap-2">
            <span className="type-caption text-body">Confirm password</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              className="h-12 rounded-md border border-hairline bg-canvas px-4 type-body-md text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-4 focus:ring-primary/20"
              placeholder="8+ characters"
              disabled={pending}
            />
          </label>
        )}

        <Button type="submit" size="lg" className="mt-1 h-12 w-full" disabled={pending}>
          {pending ? "Working..." : copy.action}
        </Button>
      </form>

      <div className="border-t border-hairline px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 type-body-sm text-muted">
        {mode !== "login" && (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-body transition-colors hover:text-primary"
          >
            Sign in
          </button>
        )}
        {mode !== "signup" && (
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="text-body transition-colors hover:text-primary"
          >
            Create account
          </button>
        )}
        {mode !== "forgot" && mode !== "reset" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="text-body transition-colors hover:text-primary"
          >
            Forgot password?
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
