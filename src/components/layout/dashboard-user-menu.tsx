"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, HelpCircle, LogOut, Settings, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSettingsDialog } from "@/components/layout/dashboard-settings-dialog";

type DashboardUserMenuProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initialLetter: string;
  avatarBgColor: string;
  signInMethod: "Google" | "Email";
};

export function DashboardUserMenu({
  displayName,
  email,
  avatarUrl,
  initialLetter,
  avatarBgColor,
  signInMethod,
}: DashboardUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !settingsOpen) setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, settingsOpen]);

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer",
            open ? "bg-surface-card" : "hover:bg-surface-card",
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8.5 w-8.5 shrink-0 rounded-full border border-hairline object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: avatarBgColor }}
            >
              {initialLetter}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-soft">{email}</p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-muted-soft transition-transform",
              open ? "rotate-0" : "rotate-180",
            )}
            strokeWidth={1.5}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-lg border border-hairline bg-canvas py-1 shadow-lg"
          >
            <Link
              href="/profile/personal"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-body transition-colors hover:bg-surface-card hover:text-ink"
            >
              <UserCircle className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-body transition-colors hover:bg-surface-card hover:text-ink cursor-pointer"
            >
              <Settings className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
              Settings
            </button>
            <Link
              href="/dashboard/chat"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-body transition-colors hover:bg-surface-card hover:text-ink"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
              Help
            </Link>
            <form action="/auth/signout" method="post" role="none">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-error transition-colors hover:bg-error/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0 text-error" strokeWidth={1.5} />
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {settingsOpen ? (
        <DashboardSettingsDialog
          email={email}
          displayName={displayName}
          signInMethod={signInMethod}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}
