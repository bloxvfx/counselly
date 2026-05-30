"use client";

import Link from "next/link";
import { useState } from "react";
import { CounsellyMark, CounsellyText } from "@/components/brand/counselly-mark";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "/#features" },
  { label: "Pricing",  href: "/pricing" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-24 bg-canvas/92 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl h-full px-6 lg:px-8 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2.5">
          <CounsellyMark className="h-10 w-auto md:h-12" decorative priority />
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

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2.5 text-muted"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className={cn("block w-5 h-0.5 bg-ink transition-all mb-1.5", open && "rotate-45 translate-y-2")} />
          <span className={cn("block w-5 h-0.5 bg-ink transition-all", open && "-rotate-45 -translate-y-0")} />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-canvas px-6 py-4 flex flex-col gap-1 shadow-sm border-b border-hairline">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-base text-body py-3 border-b border-hairline-soft last:border-0"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
