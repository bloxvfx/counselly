"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { cn } from "@/lib/utils";

const ease = [0.21, 0.47, 0.32, 0.98] as const;

type DashboardMobileNavProps = {
  items: NavItem[];
  children: React.ReactNode;
};

export function DashboardMobileNav({ items, children }: DashboardMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center gap-2 border-b border-hairline bg-canvas/95 px-3 backdrop-blur-md sm:px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-soft"
          aria-expanded={open}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center",
            counsellyLogoLockupClass,
            "group hover:opacity-80 transition-opacity",
          )}
        >
          <CounsellyMark className="h-[26px]" decorative />
          <CounsellyText className="h-[16px] w-auto" />
        </Link>

        <div className="h-11 w-11 shrink-0" aria-hidden />
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,17.5rem)] flex-col border-r border-hairline bg-surface-soft shadow-xl lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard navigation"
            >
              <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-hairline px-4">
                <Link
                  href="/dashboard"
                  className={cn("flex items-center", counsellyLogoLockupClass)}
                  onClick={() => setOpen(false)}
                >
                  <CounsellyMark className="h-[26px]" decorative />
                  <CounsellyText className="h-[16px] w-auto" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-card hover:text-ink"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <DashboardNav items={items} onNavigate={() => setOpen(false)} />

              <div className="mt-auto shrink-0">{children}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
