import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  CounsellyMark,
  CounsellyText,
  counsellyLogoLockupClass,
} from "@/components/brand/counselly-mark";
import { InPageAnchor } from "@/components/layout/in-page-anchor";

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGithub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const socialLinks = [
  { label: "Counselly on X", href: "https://x.com", Icon: IconX },
  { label: "Counselly on Instagram", href: "https://www.instagram.com/counselly.learning/", Icon: IconInstagram },
  { label: "Counselly on LinkedIn", href: "https://linkedin.com", Icon: IconLinkedIn },
  { label: "Counselly on GitHub", href: "https://github.com", Icon: IconGithub },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative mt-6 md:mt-10">
      <div className="relative overflow-hidden rounded-t-[1.75rem] border border-hairline border-b-0 bg-surface-card text-ink shadow-[0_-10px_40px_rgba(20,20,19,0.06)] sm:rounded-t-[2.25rem]">
          {/* Ambient wash + grain */}
          <div
            className="pointer-events-none absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full opacity-[0.35] blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 72%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-[22rem] w-[22rem] rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent-teal) 22%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.055] mix-blend-multiply"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />

          <CounsellyMark
            decorative
            className="pointer-events-none absolute -right-4 bottom-[-3.5rem] h-[min(52vw,18rem)] w-auto opacity-[0.09] sm:h-[min(42vw,22rem)]"
          />

          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-16">
            <div className="grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.5fr)_minmax(0,0.5fr)] lg:gap-16">
              {/* Brand */}
              <div className="max-w-md">
                <Link
                  href="/"
                  className={`mb-6 flex flex-wrap items-center ${counsellyLogoLockupClass} group hover:opacity-80 transition-opacity`}
                >
                  <CounsellyMark className="h-7 w-auto sm:h-8" decorative />
                  <CounsellyText className="h-[14px] sm:h-[18px] w-auto" />
                </Link>

                <p className="type-body-md text-body mb-6 max-w-sm leading-relaxed">
                  AI-powered college counselling for every Indian student — timelines, essays, lists, and answers that
                  actually fit your story.
                </p>

                <div
                  className="mb-6 inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-pill border border-primary/20 px-3.5 py-2 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-soft)) 0%, var(--color-surface-soft) 55%, color-mix(in srgb, var(--color-accent-teal) 6%, var(--color-surface-soft)) 100%)",
                  }}
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-success opacity-35" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-success/25" />
                  </span>
                  <span className="type-caption text-body">
                    <span className="font-medium text-ink">Free while you learn the process</span>
                    <span className="text-muted"> · Early access open</span>
                  </span>
                </div>

                <p className="type-body-sm text-muted">
                  Made with care for students across India.
                </p>
              </div>

              {/* Explore */}
              <div>
                <p className="type-caption-upper text-muted mb-5">Explore</p>
                <ul className="flex flex-col gap-3">
                  <li>
                    <InPageAnchor
                      href="#features"
                      className="type-body-md font-medium text-ink transition-colors hover:text-primary"
                    >
                      Features
                    </InPageAnchor>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="type-body-md font-medium text-ink transition-colors hover:text-primary"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth"
                      className="type-body-md font-medium text-primary transition-colors hover:text-primary-active"
                    >
                      Get started
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <p className="type-caption-upper text-muted mb-5">Legal</p>
                <ul className="flex flex-col gap-3">
                  <li>
                    <Link href="#" className="type-body-md font-medium text-ink transition-colors hover:text-primary">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="type-body-md font-medium text-ink transition-colors hover:text-primary">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="type-body-md font-medium text-ink transition-colors hover:text-primary">
                      Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-14 flex flex-col gap-6 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="type-body-sm text-muted-soft order-2 sm:order-1">
                © {new Date().getFullYear()} Counselly. All rights reserved.
              </p>
              <div className="order-1 flex items-center gap-1 sm:order-2 sm:justify-end">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem]" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
    </footer>
  );
}
