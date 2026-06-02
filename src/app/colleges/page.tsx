import { Suspense } from "react";
import { searchColleges } from "@/lib/colleges-db";
import { CollegesDirectoryClient } from "./colleges-directory-client";
import { Nav } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata = {
  title: "College Directory — Counselly",
  description:
    "Browse 1000+ universities worldwide. Filter by country, acceptance rate, financial aid, programs and more. Built for Indian students applying internationally.",
};

async function CollegesContent() {
  const { data, total } = await searchColleges({ limit: 24, page: 0 });

  return (
    <CollegesDirectoryClient initialColleges={data} initialTotal={total} />
  );
}

function CollegesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-48 bg-surface-soft rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function CollegesPage() {
  return (
    <>
      <Nav />

      <main className="min-h-screen bg-canvas animate-premium-reveal">
        {/* ── Hero banner ──────────────────────────────────────────────────── */}
        <section className="bg-surface-dark text-on-dark py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-dark-soft mb-3">
              College Directory
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-normal leading-tight mb-4">
              Find Your Ideal University
            </h1>
            <p className="text-on-dark-soft text-lg max-w-2xl leading-relaxed">
              Browse 1,000+ universities worldwide — from Ivy League to top European schools.
              Filter by country, acceptance rate, financial aid, and programs. Built specifically
              for Indian students applying internationally.
            </p>

            {/* Quick stat chips */}
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                "🇺🇸 600+ US Universities",
                "🇬🇧 50+ UK Universities",
                "🇨🇦 Canada & Australia",
                "🌏 Asia & Europe",
              ].map((label) => (
                <span
                  key={label}
                  className="text-sm text-on-dark bg-surface-dark-elevated px-3 py-1.5 rounded-pill border border-white/10"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Directory ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 lg:px-8 py-12">
          <Suspense fallback={<CollegesSkeleton />}>
            <CollegesContent />
          </Suspense>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
