"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle,
  ListChecks,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageCircle,
  LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  UserCircle,
  ListChecks,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageCircle,
  LayoutList,
} as const;

export type IconKey = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
};

export function DashboardNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 pt-4">
      {items.map(({ href, label, icon }) => {
        const active = isActive(href);
        const Icon = ICONS[icon];
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 type-caption transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-0.5",
              active
                ? "bg-primary/8 text-primary font-medium"
                : "text-muted hover:bg-surface-card hover:text-ink",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")}
              strokeWidth={active ? 2 : 1.5}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
