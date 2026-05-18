import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SapientiaMark } from "@/components/brand/sapientia-mark";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/college-list", label: "College List", Icon: ListChecks },
  { href: "/dashboard/timeline", label: "Timeline", Icon: CalendarDays },
  { href: "/dashboard/essays", label: "Essays", Icon: FileText },
  { href: "/dashboard/scholarships", label: "Scholarships", Icon: GraduationCap },
  { href: "/dashboard/chat", label: "AI Counsellor", Icon: MessageCircle },
  { href: "/dashboard/profile", label: "Profile", Icon: User },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("sapientia_profiles")
    .select("onboarding_completed, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const displayName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-surface-soft lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-hairline px-5">
          <SapientiaMark className="h-5" decorative />
          <span className="font-display text-[1.1rem] font-[400] tracking-tight text-ink">
            Sapientia
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3 pt-4">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 type-caption transition-colors",
                "text-muted hover:bg-surface-card hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-hairline p-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.65rem] font-medium text-on-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate type-caption text-ink">{displayName}</p>
              <p className="truncate type-caption text-muted" style={{ fontSize: "0.7rem" }}>
                {user.email}
              </p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-1">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 type-caption text-left text-muted transition-colors hover:bg-surface-card hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-canvas px-4 lg:hidden">
        <SapientiaMark className="h-5" decorative />
        <span className="font-display text-[1.1rem] font-[400] tracking-tight text-ink">
          Sapientia
        </span>
      </div>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
