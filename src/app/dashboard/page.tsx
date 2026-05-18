import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, MessageCircle } from "lucide-react";
import Link from "next/link";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/college-list",
    Icon: BookOpen,
    title: "Build your college list",
    desc: "Explore and shortlist universities that fit your profile.",
  },
  {
    href: "/dashboard/timeline",
    Icon: CalendarDays,
    title: "Set up your timeline",
    desc: "Stay on top of deadlines and milestones.",
  },
  {
    href: "/dashboard/scholarships",
    Icon: GraduationCap,
    title: "Find scholarships",
    desc: "Discover funding opportunities matched to your profile.",
  },
  {
    href: "/dashboard/chat",
    Icon: MessageCircle,
    title: "Chat with your counsellor",
    desc: "Ask anything about your application strategy.",
  },
];

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("sapientia_profiles")
    .select("full_name, grade, target_countries, intended_major, application_cycle")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    profile?.full_name?.split(" ")[0] ??
    user.user_metadata?.full_name?.split(" ")[0] ??
    "there";

  const countries = (profile?.target_countries as string[] | null)?.join(", ") ?? "—";
  const cycle = profile?.application_cycle ?? "—";

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      {/* Greeting */}
      <div>
        <p className="type-caption-upper text-muted mb-1">Overview</p>
        <h1 className="type-display-md text-ink">
          Welcome back, {firstName}.
        </h1>
        <p className="type-body-sm text-body mt-2">
          {profile?.intended_major && `${profile.intended_major} · `}
          {countries} · {cycle}
        </p>
      </div>

      {/* Quick actions */}
      <div>
        <p className="type-caption text-muted mb-4">Get started</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft border border-hairline transition-all duration-200 group-hover:bg-primary/8 group-hover:border-primary/20">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="type-caption text-ink mb-1">{title}</p>
                <p className="type-body-sm text-muted">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile completeness nudge */}
      <div className="rounded-lg border border-hairline bg-surface-soft p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-caption text-ink mb-1">Complete your profile</p>
            <p className="type-body-sm text-muted">
              The more Sapientia knows about you, the better it can tailor your college list, essays, and strategy.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 type-caption text-on-primary transition-colors hover:bg-primary-active"
          >
            Edit profile
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 h-1.5 rounded-pill bg-surface-cream-strong">
          <div className="h-full w-1/4 rounded-pill bg-primary transition-all" />
        </div>
        <p className="mt-2 type-caption text-muted">25% complete</p>
      </div>
    </div>
  );
}
