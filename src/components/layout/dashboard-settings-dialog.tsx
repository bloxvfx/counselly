"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OverlayPortal } from "@/components/ui/overlay-portal";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthCallbackUrl,
  isEmailSendRateLimit,
} from "@/lib/auth-urls";
import { Z_INDEX } from "@/lib/z-index";

type Notice = { kind: "ok" | "error"; text: string } | null;

type DashboardSettingsDialogProps = {
  onClose: () => void;
  email: string;
  displayName: string;
  signInMethod: "Google" | "Email";
};

export function DashboardSettingsDialog({
  onClose,
  email,
  displayName,
  signInMethod,
}: DashboardSettingsDialogProps) {
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function handleResetPassword() {
    if (!email.trim()) return;

    setPending(true);
    setNotice(null);

    try {
      const sb = createClient();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthCallbackUrl("/auth?mode=reset"),
      });

      if (error) {
        setNotice({
          kind: "error",
          text: isEmailSendRateLimit(error)
            ? "Too many requests. Wait a minute and try again."
            : error.message,
        });
        return;
      }

      setNotice({
        kind: "ok",
        text: "Reset link sent — check your inbox for " + email.trim() + ".",
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Could not send reset email. Try again in a moment.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 animate-backdrop-fade"
        style={{
          zIndex: Z_INDEX.modal,
          backgroundColor: "rgba(20, 20, 19, 0.45)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-hairline bg-canvas shadow-xl animate-modal-scale"
        >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 id={titleId} className="type-caption text-ink">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-ink"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-6 py-5">
          <section className="mb-6">
            <h3 className="type-caption-upper text-muted mb-3">Account</h3>
            <div className="space-y-3">
              <SettingsField label="Name" value={displayName} />
              <SettingsField label="Sign-in email" value={email} />
              <SettingsField label="Sign-in method" value={signInMethod} />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="type-caption-upper text-muted mb-3">Security</h3>
            <div className="space-y-3">
              <p className="type-body-sm text-muted">
                {signInMethod === "Google"
                  ? "You sign in with Google. Reset your password to also sign in with email."
                  : "We'll email you a link to reset your password."}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full"
                disabled={pending || !email.trim()}
                onClick={() => void handleResetPassword()}
              >
                {pending ? "Sending…" : "Reset password"}
              </Button>
            </div>
          </section>

          <section>
            <h3 className="type-caption-upper text-muted mb-3">Preferences</h3>
            <p className="type-body-sm text-muted-soft">
              More account options — like notification preferences — are on the
              way.
            </p>
          </section>

          {notice ? (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={cn(
                "mt-4 rounded-lg border px-3 py-2.5 type-body-sm",
                notice.kind === "error"
                  ? "border-error/30 bg-error/10 text-error"
                  : "border-success/30 bg-success/10 text-body",
              )}
            >
              {notice.text}
            </p>
          ) : null}
        </div>

        <div className="border-t border-hairline px-6 py-4">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

function SettingsField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="type-caption-upper text-muted mb-1.5" style={{ fontSize: "0.6rem" }}>
        {label}
      </p>
      <div className="rounded-md border border-hairline bg-surface-soft px-3 py-2.5 type-body-sm text-ink">
        {value}
      </div>
    </div>
  );
}
