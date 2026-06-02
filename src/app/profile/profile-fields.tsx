"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AnchoredDropdownPanel,
  useAnchoredDropdown,
} from "@/components/ui/anchored-dropdown";

export const profileInputCls =
  "h-9 w-full rounded-md border border-hairline bg-canvas px-3 type-body-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40";

export const profileLabelCls = "type-caption-upper text-muted mb-1.5 block";
export const profileLabelStyle = { fontSize: "0.6rem" } as const;

export function ProfileFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className={profileLabelCls} style={profileLabelStyle}>
      {children}
    </label>
  );
}

export function ProfileCustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  searchable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const { open, setOpen, anchorRef, menuRef, rect, close } = useAnchoredDropdown();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, searchable]);

  const q = query.trim().toLowerCase();
  const filtered = searchable && q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
      )
    : options;

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
        className="h-9 w-full flex items-center justify-between rounded-md border border-hairline bg-canvas px-3 type-body-sm hover:border-primary/30 transition-colors"
      >
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>
      <AnchoredDropdownPanel
        open={open}
        rect={rect}
        menuRef={menuRef}
        className="flex max-h-60 flex-col overflow-hidden"
      >
        {searchable && (
          <div className="shrink-0 border-b border-hairline p-2">
            <input
              ref={searchRef}
              id={searchId}
              type="text"
              value={query}
              autoComplete="off"
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-hairline bg-canvas px-2.5 type-body-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
            />
          </div>
        )}
        <div className="min-h-0 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 type-body-sm text-muted">No matches</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  close();
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 type-body-sm transition-colors text-left",
                  o.value === value
                    ? "text-primary bg-primary/5 font-medium"
                    : "text-ink hover:bg-surface-soft",
                )}
              >
                {o.label}
                {o.value === value && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2} />
                )}
              </button>
            ))
          )}
        </div>
      </AnchoredDropdownPanel>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS = MONTHS.map((label, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label,
}));

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Day / month / year dropdowns — matches Testing tab date controls. */
export function DateOfBirthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [year, setYear] = useState(() => (value ? value.slice(0, 4) : ""));
  const [month, setMonth] = useState(() => (value ? value.slice(5, 7) : ""));
  const [day, setDay] = useState(() => (value ? value.slice(8, 10) : ""));

  useEffect(() => {
    const timer = setTimeout(() => {
      setYear(value ? value.slice(0, 4) : "");
      setMonth(value ? value.slice(5, 7) : "");
      setDay(value ? value.slice(8, 10) : "");
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 55 }, (_, i) => {
    const y = String(currentYear - 10 - i);
    return { value: y, label: y };
  });

  const yNum = year ? parseInt(year, 10) : currentYear - 17;
  const mNum = month ? parseInt(month, 10) : 1;
  const maxDay = daysInMonth(yNum, mNum);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return { value: d, label: d };
  });

  function emit(next: { y?: string; m?: string; d?: string }) {
    const y = next.y ?? year;
    const m = next.m ?? month;
    let d = next.d ?? day;
    if (next.y !== undefined) setYear(y);
    if (next.m !== undefined) setMonth(m);
    if (y && m && d) {
      const cappedDay = Math.min(
        parseInt(d, 10),
        daysInMonth(parseInt(y, 10), parseInt(m, 10)),
      );
      d = String(cappedDay).padStart(2, "0");
    }
    if (next.d !== undefined || (y && m && d)) setDay(d);
    if (!y || !m || !d) return;
    onChange(`${y}-${m}-${d}`);
  }

  return (
    <div className="flex max-w-md flex-wrap gap-2 sm:flex-nowrap">
      <ProfileCustomSelect
        value={day}
        onChange={(d) => emit({ d })}
        options={dayOptions}
        placeholder="Day"
        className="w-20 shrink-0"
        searchable
      />
      <ProfileCustomSelect
        value={month}
        onChange={(m) => emit({ m })}
        options={MONTH_OPTIONS}
        placeholder="Month"
        className="flex-1"
        searchable
      />
      <ProfileCustomSelect
        value={year}
        onChange={(y) => emit({ y })}
        options={yearOptions}
        placeholder="Year"
        className="w-24 shrink-0"
        searchable
      />
    </div>
  );
}
