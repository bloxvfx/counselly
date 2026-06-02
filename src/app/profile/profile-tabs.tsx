"use client";

import { cn } from "@/lib/utils";
import { PROFILE_SECTIONS, type ProfileSectionSlug } from "./sections";

type ProfileTabNavProps = {
  section: ProfileSectionSlug;
  onSelect: (slug: ProfileSectionSlug) => void;
};

export function ProfileTabNav({ section, onSelect }: ProfileTabNavProps) {
  return (
    <div className="-mx-4 mb-6 border-b border-hairline sm:-mx-0">
      <div
        className="flex gap-0 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Profile sections"
      >
        {PROFILE_SECTIONS.map((tab) => {
          const active = tab.slug === section;
          const mobileLabel = tab.shortLabel;
          return (
            <button
              key={tab.slug}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.slug)}
              className={cn(
                "relative shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 type-caption transition-all duration-300 sm:px-4",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300",
                active
                  ? "text-ink after:opacity-100 after:scale-x-100"
                  : "text-muted hover:text-body after:opacity-0 after:scale-x-0",
              )}
            >
              <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
