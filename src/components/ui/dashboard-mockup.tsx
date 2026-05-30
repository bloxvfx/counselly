import { CheckCircle2, Circle } from "lucide-react";
import type { CSSProperties } from "react";
import { CounsellyMark } from "@/components/brand/counselly-mark";

const colleges = [
  { name: "IIT Delhi",         branch: "Computer Science",  tag: "Reach", fit: 74, tagStyle: "bg-accent-amber/10 text-accent-amber"   },
  { name: "BITS Pilani",       branch: "CS & Economics",    tag: "Match", fit: 89, tagStyle: "bg-primary/10 text-primary"              },
  { name: "Ashoka University", branch: "Economics & Math",  tag: "Safe",  fit: 95, tagStyle: "bg-success/10 text-success"              },
];

const tasks = [
  { label: "Common App essay draft",     done: true  },
  { label: "BITS HD Application",        done: true  },
  { label: "Request recommendation LOR", done: false },
  { label: "SAT Score reporting",        done: false },
];

const mockupDelay = (delay: string) => ({ "--mockup-delay": delay }) as CSSProperties;

export function DashboardMockup() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden bg-canvas border border-hairline"
      style={{ boxShadow: "0 24px 60px rgba(20,20,19,0.10), 0 4px 16px rgba(20,20,19,0.06)" }}
    >
      {/* Window chrome */}
      <div className="mockup-enter bg-surface-soft px-5 py-3.5 flex items-center gap-3 border-b border-hairline" style={mockupDelay("760ms")}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-canvas rounded-md px-4 py-1.5 flex items-center gap-1.5 border border-hairline">
            <CounsellyMark className="h-4 w-auto" decorative />
            <span className="text-muted text-xs">counselly.app/dashboard</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Student header */}
        <div className="mockup-enter flex items-center justify-between" style={mockupDelay("860ms")}>
          <div>
            <p className="text-ink text-sm font-medium">
              Good morning, Priya{" "}
              <span className="text-primary select-none" aria-hidden>✦</span>
            </p>
            <p className="text-muted text-xs mt-0.5">Class of 2026 · 4 tasks due this week</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-xs">Application progress</p>
            <p className="text-primary text-sm font-medium mt-0.5">67% complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mockup-enter h-1 bg-surface-card rounded-full overflow-hidden" style={mockupDelay("960ms")}>
          <div className="mockup-progress h-full bg-primary rounded-full" style={{ width: "68%" }} />
        </div>

        {/* College list */}
        <div className="mockup-enter" style={mockupDelay("1040ms")}>
          <p className="text-muted text-xs uppercase tracking-widest mb-3">My College List</p>
          <div className="space-y-0">
            {colleges.map((c, i) => (
              <div
                key={c.name}
                className="mockup-enter flex items-center justify-between py-2.5 border-b border-hairline-soft last:border-0"
                style={mockupDelay(`${1120 + i * 90}ms`)}
              >
                <div>
                  <p className="text-ink text-xs font-medium">{c.name}</p>
                  <p className="text-muted text-[11px] mt-0.5">{c.branch}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-xs">{c.fit}% fit</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.tagStyle}`}>
                    {c.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="mockup-enter" style={mockupDelay("1420ms")}>
          <p className="text-muted text-xs uppercase tracking-widest mb-3">Upcoming Tasks</p>
          <div className="space-y-2.5">
            {tasks.map((t, i) => (
              <div
                key={t.label}
                className="mockup-enter flex items-center gap-2.5"
                style={mockupDelay(`${1500 + i * 70}ms`)}
              >
                {t.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" strokeWidth={2} />
                  : <Circle className="w-3.5 h-3.5 text-hairline shrink-0" strokeWidth={2} />
                }
                <span className={`text-xs ${t.done ? "text-muted line-through" : "text-ink"}`}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI chat strip */}
        <div className="mockup-enter bg-surface-soft rounded-xl p-4 border border-hairline-soft" style={mockupDelay("1820ms")}>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
              <CounsellyMark className="h-3 w-auto" decorative />
            </div>
            <div>
              <p className="text-ink text-xs font-medium mb-1">Counselly</p>
              <p className="text-muted text-xs leading-relaxed">
                Your JEE score puts BITS Pilani CS well within reach. I&apos;d prioritise your SOP this week — want me to draft it based on your profile?
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 pl-8">
            <div className="bg-canvas text-muted text-xs rounded-full px-3 py-1.5 border border-hairline cursor-pointer hover:text-ink hover:border-primary/30 transition-colors">
              Yes, draft it
            </div>
            <div className="bg-canvas text-muted text-xs rounded-full px-3 py-1.5 border border-hairline cursor-pointer hover:text-ink hover:border-primary/30 transition-colors">
              Show other tips
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
