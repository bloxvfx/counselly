"use client";

import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useEffect, useState } from "react";

/** Sticky site header is `h-24` (6rem) — keep section headings clear of it */
const STICKY_HEADER_PX = 96;

const lenisOptions = {
  autoRaf: true,
  /** Higher lerp = less float, more responsive (Lenis default is ~0.1) */
  lerp: 0.072,
  smoothWheel: true,
  syncTouch: true,
  syncTouchLerp: 0.068,
  wheelMultiplier: 0.94,
  touchMultiplier: 1,
  anchors: { offset: -STICKY_HEADER_PX },
  stopInertiaOnNavigate: true,
} as const;

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!enabled) {
    return children;
  }

  return (
    <ReactLenis root options={lenisOptions}>
      {children}
    </ReactLenis>
  );
}
