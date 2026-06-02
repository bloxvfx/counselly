import { Suspense } from "react";
import Link from "next/link";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { getChecklistProgress, getLayoutProfile } from "@/lib/supabase/cached";
import { getProfileContext } from "@/lib/profile-context";
import type { ProfileSnapshot } from "@/types/profile-context";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { SidebarNextSteps } from "@/components/layout/sidebar-next-steps";
import { DashboardUserFooter } from "@/components/layout/dashboard-user-footer";
import { SidebarUserSkeleton } from "@/components/loading/page-skeletons";
import { CounsellyAIAssistant } from "@/components/layout/ai-assistant-widget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getLayoutProfile();
  const checklistFlags = await getChecklistProgress();
  const ctx = getProfileContext(
    profile
      ? ({
          target_countries: profile.target_countries,
          intended_major: profile.intended_major ?? null,
          board: profile.board ?? null,
          india_track:
            "india_track" in profile
              ? ((profile as { india_track?: string | null }).india_track ?? null)
              : null,
          academic_score: null,
          tests_taken: null,
          activities: null,
          help_needed: profile.help_needed,
        } satisfies ProfileSnapshot)
      : null,
  );

  const hideSidebarExtras = true;
  const ALL_NAV_ITEMS: (NavItem & { hidden?: boolean })[] = [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/profile", label: "Your Profile", icon: "UserCircle" },
    { href: "/dashboard/college-list", label: "College List", icon: "ListChecks" },
    { href: "/dashboard/plan", label: "Plan", icon: "CalendarDays" },
    {
      href: "/dashboard/essays",
      label: "Essays",
      icon: "FileText",
      hidden: hideSidebarExtras || !ctx.needsEssays,
    },
    {
      href: "/dashboard/scholarships",
      label: "Scholarships",
      icon: "GraduationCap",
      hidden: hideSidebarExtras,
    },
    {
      href: "/dashboard/chat",
      label: "AI Counsellor",
      icon: "MessageCircle",
      hidden: hideSidebarExtras,
    },
  ];

  const navItems = ALL_NAV_ITEMS.filter((item) => !item.hidden) as NavItem[];

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-surface-soft lg:flex h-screen sticky top-0">
        <div className="flex h-[76px] items-end px-6 pb-[19px]">
          <Link
            href="/dashboard"
            className={`flex items-center ${counsellyLogoLockupClass} group hover:opacity-80 transition-opacity`}
          >
            <CounsellyMark className="h-[30px]" decorative />
            <CounsellyText className="h-[19px] w-auto" />
          </Link>
        </div>

        <DashboardNav items={navItems} />

        <SidebarNextSteps flags={checklistFlags} />

        <Suspense fallback={<SidebarUserSkeleton />}>
          <DashboardUserFooter />
        </Suspense>
      </aside>

      <DashboardMobileNav items={navItems}>
        <SidebarNextSteps flags={checklistFlags} />
        <Suspense fallback={<SidebarUserSkeleton />}>
          <DashboardUserFooter />
        </Suspense>
      </DashboardMobileNav>

      <main className="flex min-w-0 flex-1 flex-col pt-[68px] lg:pt-0">
        {children}
      </main>

      {/* Global Floating AI Counsellor Assistant Widget */}
      <CounsellyAIAssistant />
    </div>
  );
}
