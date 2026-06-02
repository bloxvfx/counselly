# Database Structure — Counselly

> **Project:** `xiwaeetiolcxqoufsejw` (Supabase)  
> **Last synced:** 2026-06-01  
> **Auth pool shared with:** Lerno (AI study app)

---

## Legend

| Icon | Meaning |
|------|---------|
| 🟢 | Counselly-owned table — safe to modify |
| 🔴 | Lerno-owned table — **read-only at most, never write** |
| 🔑 | Primary key |
| 🔗 | Foreign key |
| 📅 | Auto-set timestamp |

---

## 🟢 Counselly Tables

### `counselly_profiles`

The core Counselly table. One row per user. Created during onboarding.  
`id` is the same UUID as `auth.users.id` — no separate user table needed.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| 🔑 `id` | `uuid` | — | FK → `auth.users.id`, ON DELETE CASCADE |
| `email` | `text` | — | Copied from auth at onboarding |
| `full_name` | `text` | — | Pre-filled from Lerno auth metadata |
| `grade` | `text` | — | `'9'` \| `'10'` \| `'11'` \| `'12'` \| `'gap_year'` \| `'applied'` |
| `board` | `text` | — | `'CBSE'` \| `'ICSE_ISC'` \| `'IB'` \| `'Cambridge'` \| `'State Board'` \| `'Other'` |
| `target_countries` | `text[]` | — | e.g. `['USA', 'UK', 'Canada']` |
| `intended_major` | `text` | — | e.g. `'Engineering & CS'` |
| `academic_score` | `text` | — | Raw string, e.g. `'92'` or `'9.2'` |
| `score_type` | `text` | `'percentage'` | `'percentage'` \| `'cgpa_10'` \| `'cgpa_4'` \| `'ib'` |
| `tests_taken` | `text[]` | — | e.g. `['SAT', 'IELTS']` |
| `tests_planned` | `text[]` | — | e.g. `['TOEFL']` |
| `application_cycle` | `text` | — | `'2025-26'` \| `'2026-27'` \| `'2027-28'` \| `'unsure'` |
| `financial_aid_importance` | `text` | — | `'critical'` \| `'helpful'` \| `'not_needed'` |
| `college_type_preference` | `text[]` | — | e.g. `['Research Universities', 'Liberal Arts Colleges']` |
| `activities` | `text[]` | — | e.g. `['Debate / MUN', 'Research / Science']` |
| `help_needed` | `text[]` | — | e.g. `['Building my college list', 'Writing application essays']` |
| `personal_details` | `jsonb` | — | Optional profile fields (pronouns, DOB, timezone, bio, etc.) — see `src/lib/personal-details.ts` |
| `onboarding_completed` | `boolean` | `false` | Gate for dashboard access |
| 📅 `created_at` | `timestamptz` | `now()` | Set once on insert |
| 📅 `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:**
- `SELECT` → `auth.uid() = id`
- `INSERT` → `auth.uid() = id`
- `UPDATE` → `auth.uid() = id`

**Trigger:** `counselly_profiles_updated_at` — calls `counselly_set_updated_at()` on every UPDATE.

---

### `counselly_colleges`

Shared reference table — the public college directory. Not user-specific. Seeded via `scripts/seed-colleges.mjs`. RLS allows public read; only the service role (seed script) can write.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| 🔑 `id` | `uuid` | `gen_random_uuid()` | |
| `name` | `text` | — | Full college name |
| `slug` | `text` | — | URL slug, unique (e.g. `massachusetts-institute-of-technology`) |
| `country` | `text` | — | `'USA'` \| `'UK'` \| `'Canada'` \| `'Australia'` \| etc. |
| `state_province` | `text` | — | e.g. `'MA'`, `'Ontario'` |
| `city` | `text` | — | |
| `college_type` | `text` | — | `'research_university'` \| `'liberal_arts'` \| `'technical'` \| `'arts'` |
| `control` | `text` | — | `'public'` \| `'private'` |
| `qs_rank` | `integer` | — | QS World University Ranking |
| `qs_rank_year` | `integer` | — | Year of QS rank |
| `us_news_rank` | `integer` | — | US News National ranking |
| `acceptance_rate` | `numeric(5,2)` | — | Percentage, e.g. `5.40` |
| `test_optional` | `boolean` | `false` | |
| `avg_sat_math_25/75` | `integer` | — | 25th/75th percentile SAT Math |
| `avg_sat_read_25/75` | `integer` | — | 25th/75th percentile SAT Reading |
| `avg_act_25/75` | `integer` | — | 25th/75th percentile ACT |
| `avg_gpa` | `numeric(4,2)` | — | |
| `undergrad_enrollment` | `integer` | — | |
| `annual_tuition_usd` | `integer` | — | |
| `annual_cost_usd` | `integer` | — | Tuition + room + board |
| `intl_financial_aid` | `boolean` | `false` | Awards aid to international students |
| `avg_intl_aid_usd` | `integer` | — | Average intl aid package |
| `strong_programs` | `text[]` | `'{}'` | e.g. `['CS', 'Economics']` |
| `tags` | `text[]` | `'{}'` | e.g. `['ivy-league', 'need-blind-intl', 'stem-heavy']` |
| `website_url` | `text` | — | |
| `application_portal` | `text` | — | `'common_app'` \| `'ucas'` \| `'direct'` \| etc. |
| `early_deadline` | `date` | — | |
| `regular_deadline` | `date` | — | |
| `description` | `text` | — | 2–3 sentence summary |
| `notable_facts` | `text[]` | `'{}'` | Quick bullets for AI context |
| `scorecard_id` | `text` | — | US College Scorecard unit ID |
| 📅 `created_at` | `timestamptz` | `now()` | |
| 📅 `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**RLS policies:**
- `SELECT` → `USING (true)` — public, no auth required
- No INSERT/UPDATE/DELETE policies — only service role can write

**Indexes:** GIN on `name` (full-text), `tags`, `strong_programs`; B-tree on `country`, `qs_rank`, `acceptance_rate`, `slug`.

**Seeding:** `node scripts/seed-colleges.mjs` — pulls ~600 US colleges from College Scorecard API + ~400 international colleges from `scripts/data/colleges-intl.json`.

---

## 🔴 Lerno Tables (Do Not Modify)

> Full schema lives in Lerno's codebase. Listed here for awareness only.

### `profiles`
Core Lerno user profile. Referenced to adapt users into Counselly — never written to.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | FK → `auth.users.id` |
| `username` | `text` | Lerno display name |
| `full_name` | `text` | |
| `avatar_url` | `text` | |
| `grade` | `smallint` | Lerno grade (for study content, not counselling) |
| `board` | `text` | e.g. `'CBSE'`, `'ICSE'`, `'IB'` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `social_profiles`
Public-facing Lerno social layer.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | FK → `auth.users.id` |
| `display_name` | `text` | |
| `bio` | `text` | |
| `followers_count` | `integer` | |
| `following_count` | `integer` | |

### `tutor_sessions`
AI tutor conversation sessions. Each row is one chat thread.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `title` | `text` | Auto-generated from first message |
| `subject` | `text` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `tutor_messages`
Individual messages within a tutor session.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `session_id` | `uuid` | FK → `tutor_sessions.id` |
| `role` | `text` | `'user'` \| `'assistant'` |
| `content` | `text` | |
| `created_at` | `timestamptz` | |

### `student_topic_progress`
Per-topic mastery tracking for Lerno study content.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `user_id` | `uuid` | |
| `subject` | `text` | |
| `chapter_index` | `smallint` | |
| `topic_index` | `smallint` | |
| `mastery_score` | `numeric` | 0–1 |
| `attempts` | `integer` | |
| `updated_at` | `timestamptz` | |

### `study_attempts`
Individual question attempts during study sessions.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `user_id` | `uuid` | |
| `question_id` | `text` | |
| `is_correct` | `boolean` | |
| `time_taken_ms` | `integer` | |
| `created_at` | `timestamptz` | |

### `daily_study_stats`
Aggregated daily stats per user.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `user_id` | `uuid` | |
| `date` | `date` | |
| `total_minutes` | `integer` | Default `0` |
| `subjects_covered` | `text[]` | Default `'{}'` |
| `events_completed` | `integer` | Default `0` |
| `backlog_reduced` | `integer` | Default `0` |

### `vs_battles`
1v1 study battles between Lerno users.

| Column | Type | Notes |
|--------|------|-------|
| 🔑 `id` | `uuid` | |
| `subject` | `text` | |
| `status` | `text` | `'waiting'` \| `'active'` \| `'finished'` |
| `created_at` | `timestamptz` | |

### Other Lerno tables (schema not detailed here)
- `chapter_learn_progress`
- `diagnostic_questions_cache`
- `direct_message_threads` + `direct_messages`
- `exam_plan_runs`
- `friend_lists`, `friend_requests`, `friendships`
- `general_feedback`, `message_feedback`
- `memory_entries`, `student_ai_memory`
- `notifications`
- `query_cache`, `retrieved_chunks_log`
- `social_study_sessions`
- `study_backlog`, `study_events`, `study_feed_sessions`, `study_questions`
- `tutor_session_shares`
- `user_blocks`, `user_daily_activity`
- `vs_battle_attempts`, `vs_battle_events`, `vs_battle_participants`, `vs_battle_stats`

---

## Auth

Supabase Auth (`auth.users`) is shared between Lerno and Counselly.  
No separate user creation — Lerno accounts work seamlessly in Counselly via OAuth/email.

**Relevant `auth.users` fields Counselly reads:**
- `id` → used as `counselly_profiles.id`
- `email` → copied to `counselly_profiles.email`
- `user_metadata.full_name` / `user_metadata.name` → pre-fills name in onboarding

---

## Future Tables Checklist

When adding a new Counselly table, verify:

- [ ] Table name starts with `counselly_`
- [ ] `id` references `auth.users(id) ON DELETE CASCADE` (or uses `user_id` FK)
- [ ] RLS enabled immediately after `CREATE TABLE`
- [ ] SELECT + INSERT + UPDATE policies added
- [ ] `updated_at` trigger created (copy `counselly_set_updated_at()` pattern)
- [ ] `counselly_schema.sql` updated
- [ ] `DB_STRUCTURE.md` updated (this file)
