<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## About Counselly

Counselly is an AI-powered college counselling dashboard for Indian students who lack access to affordable, quality counselling. It acts as a fully personalised AI college counsellor — covering college list building, application timelines, essay guidance, extracurricular/profile advice, scholarship discovery, interview prep, and on-demand AI chat.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint with Next.js core-web-vitals + TypeScript rules
npm run start    # start production server (requires build first)
```

No test runner is configured yet — add one before writing tests.

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, ESLint 9.

**Router:** App Router only — all routes live under `src/app/`. File-based routing: `src/app/dashboard/page.tsx` → `/dashboard`. Layouts nest automatically via `layout.tsx`.

**Path alias:** `@/*` maps to `src/*`. Always use `@/` imports, never relative `../../`.

**Styling:** Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`). No `tailwind.config.js` — v4 uses CSS-first config in `globals.css`.

**Fonts:** Geist Sans and Geist Mono loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono` on `<html>`.

**Folder conventions:**
- `src/app/` — routes and layouts (App Router)
- `src/components/ui/` — base UI atoms: `button.tsx`, `badge.tsx`, `card.tsx`
- `src/components/layout/` — structural components: `nav.tsx`
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/types/` — shared TypeScript types (add as needed)

Server Components are the default in App Router. Mark a file `"use client"` only when it needs browser APIs, event handlers, or React hooks.

## Design System

Defined in `src/app/globals.css` using Tailwind v4's `@theme` block. Key conventions:

**Palette:** Warm cream canvas (`#faf9f5`) · coral primary (`#cc785c`) · dark navy surfaces (`#181715`). Never use cool grays or pure white as a background.

**Typography:** Display headlines use `font-display` (Cormorant Garamond, weight 400, negative letter-spacing) via `type-display-xl/lg/md/sm` utility classes. Body/UI text uses `font-sans` (Inter). Code uses `font-mono` (JetBrains Mono). Apply via `type-*` utility classes (e.g. `type-display-xl`, `type-body-md`, `type-caption-upper`).

**Surface rhythm:** Alternate bands — cream canvas → feature cards (`bg-surface-card`) → dark navy (`bg-surface-dark`) → coral CTA (`bg-primary`). Never repeat the same surface in consecutive bands.

**Semantic color tokens** (always use tokens, never raw hex):
- `bg-canvas`, `bg-surface-card`, `bg-surface-dark`, `bg-primary`
- `text-ink`, `text-body`, `text-muted`, `text-on-dark`, `text-on-primary`
- `border-hairline` for 1px borders on cream surfaces

**Spacing:** `py-section` = 96px band rhythm. Card internal padding `p-8` (32px).

**Border radius:** `rounded-md` (8px) buttons/inputs · `rounded-lg` (12px) cards · `rounded-pill` badges.

## Database

**Supabase project:** `xiwaeetiolcxqoufsejw` — shared with **Lerno** (an existing AI study app).

> ⚠️ **Critical:** This Supabase instance is shared. Lerno has ~35 tables. Counselly owns exactly one: `counselly_profiles`. Read `DB_RULES.md` before touching anything database-related.

**Key files:**
- `DB_RULES.md` — ownership boundaries, RLS rules, naming conventions, what NOT to do
- `DB_STRUCTURE.md` — full schema reference for all tables (Counselly + Lerno overview)
- `counselly_schema.sql` — SQL source for all Counselly-owned tables

**The only Counselly table:** `counselly_profiles`
- One row per user, `id = auth.users.id`
- Filled during onboarding at `/onboarding`
- Gates dashboard access via `onboarding_completed = true`
- RLS enabled: users can only read/write their own row

**Lerno integration:** Lerno users sign in with existing credentials. Counselly never creates auth users and never writes to Lerno tables. Only `auth.users.user_metadata` (name) is read to pre-fill onboarding.

**Supabase clients:**
- `src/lib/supabase/server.ts` — Server Components and Route Handlers
- `src/lib/supabase/client.ts` — Client Components (`"use client"`)
- `src/lib/supabase/admin.ts` — Service role (never use client-side)
