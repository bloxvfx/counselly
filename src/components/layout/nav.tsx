"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features",  href: "/#features" },
  { label: "Colleges",  href: "/colleges" },
  { label: "Pricing",   href: "/pricing" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 bg-canvas/92 backdrop-blur-md lg:h-24">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

        <Link href="/" className={cn("flex items-center", counsellyLogoLockupClass)}>
          <CounsellyMark className="h-8 w-auto md:h-10" decorative priority />
          <CounsellyText className="h-[17px] md:h-[21px] w-auto" priority />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-base font-medium text-muted hover:text-ink transition-colors px-4 py-2 rounded-md hover:bg-surface-soft"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile / tablet menu button */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className="relative block h-4 w-5" aria-hidden>
            <span
              className={cn(
                "absolute left-0 top-0 block h-0.5 w-5 bg-ink transition-all duration-200",
                open && "top-[7px] rotate-45",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-[7px] block h-0.5 w-5 bg-ink transition-all duration-200",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-[14px] block h-0.5 w-5 bg-ink transition-all duration-200",
                open && "top-[7px] -rotate-45",
              )}
            />
          </span>
        </button>
      </div>

      {open && (
        <div className="border-b border-hairline bg-canvas px-4 py-4 shadow-sm sm:px-6 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-base text-body transition-colors hover:bg-surface-soft"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="subtle-sheen mt-3 flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-on-primary transition-colors hover:bg-primary-active"
          >
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}
