"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";

export type AnchoredRect = {
  top: number;
  left: number;
  width: number;
};

export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled: boolean,
) {
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!enabled) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (refsRef.current.some((r) => r.current?.contains(target))) return;
      onOutsideRef.current();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [enabled]);
}

export function useAnchoredRect(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  gap = 4,
) {
  const [rect, setRect] = useState<AnchoredRect | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + gap, left: r.left, width: r.width });
  }, [anchorRef, gap]);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, update]);

  return rect;
}

/** Anchor + menu refs, position rect, and outside-click close for portaled menus. */
export function useAnchoredDropdown() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rect = useAnchoredRect(anchorRef, open);
  const close = useCallback(() => setOpen(false), []);

  useClickOutside([anchorRef, menuRef], close, open);

  return { open, setOpen, anchorRef, menuRef, rect, close };
}

export function AnchoredDropdownPanel({
  open,
  rect,
  menuRef,
  children,
  className,
  minWidth,
}: {
  open: boolean;
  rect: AnchoredRect | null;
  menuRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  minWidth?: number;
}) {
  if (!open || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: minWidth ? Math.max(rect.width, minWidth) : rect.width,
        zIndex: Z_INDEX.dropdown,
      }}
      className={cn(
        "rounded-lg border border-hairline bg-canvas shadow-lg",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
