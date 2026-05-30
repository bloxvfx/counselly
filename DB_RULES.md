# Database Rules — Counselly

> **Last updated:** 2026-05-28  
> **Project ref:** `xiwaeetiolcxqoufsejw` (Supabase)

---

## The Golden Rule

This project shares a Supabase instance with **Lerno** — an existing AI study app.  
**Counselly only touches tables it owns.** Everything else is read-only at most, and only for adapting Lerno users into Counselly.

---

## Table Ownership

### 🔴 LERNO — DO NOT MODIFY

These tables belong to Lerno. **Never alter their schema, add columns, drop columns, change RLS, or write to them from Counselly code.** They are listed here for awareness only.

| Table | Purpose |
|-------|---------|
| `profiles` | Lerno user profiles (username, avatar, grade, etc.) |
| `study_attempts` | Individual question attempts |
| `study_events` | Study session events |
| `study_questions` | Question bank |
| `study_backlog` | User's study backlog |
| `student_topic_progress` | Per-topic mastery tracking |
| `chapter_learn_progress` | Chapter-level progress |
| `daily_study_stats` | Daily study statistics |
| `user_daily_activity` | Activity streaks |
| `tutor_sessions` | AI tutor conversation sessions |
| `tutor_messages` | Messages within tutor sessions |
| `tutor_session_shares` | Shared tutor sessions |
| `student_ai_memory` | AI memory/context per student |
| `memory_entries` | Individual memory entries |
| `exam_plan_runs` | Exam plan generation runs |
| `diagnostic_questions_cache` | Cached diagnostic questions |
| `query_cache` | General query cache |
| `retrieved_chunks_log` | RAG retrieval log |
| `social_profiles` | Social/public profile layer |
| `friendships` | Friendship graph |
| `friend_requests` | Pending friend requests |
| `friend_lists` | Curated friend groups |
| `direct_message_threads` | DM thread index |
| `direct_messages` | DM content |
| `social_study_sessions` | Group study sessions |
| `vs_battles` | 1v1 study battles |
| `vs_battle_participants` | Battle participants |
| `vs_battle_attempts` | Per-battle question attempts |
| `vs_battle_events` | Battle event stream |
| `vs_battle_stats` | Aggregated battle stats |
| `notifications` | In-app notifications |
| `general_feedback` | App feedback submissions |
| `message_feedback` | Per-message feedback |

### ✅ COUNSELLY — Owned by this project

| Table | Purpose | File |
|-------|---------|------|
| `counselly_profiles` | College counselling profile, onboarding data | `counselly_schema.sql` |

> As Counselly grows, all new tables **must** be prefixed `counselly_` to avoid collisions with Lerno tables.

---

## How Lerno Users Sign Up for Counselly

Counselly does **not** create new auth users. It reuses the same `auth.users` pool as Lerno.

The flow:
1. User logs in with their existing Lerno credentials (Google OAuth or email/password).
2. After authentication, `middleware.ts` checks if the user has a `counselly_profiles` row.
3. If not → redirect to `/onboarding`.
4. Onboarding writes a new row to `counselly_profiles` with `id = auth.uid()`.
5. Dashboard becomes accessible once `onboarding_completed = true`.

> Reading `profiles` (Lerno) to pre-fill the user's name is acceptable, but never write to it.

---

## RLS Rules

Every Counselly table **must** have RLS enabled and explicit policies. The pattern:

```sql
-- Always enable RLS
alter table counselly_<tablename> enable row level security;

-- Users can only access their own rows
create policy "Users can read own counselly <tablename>"
  on counselly_<tablename> for select
  using (auth.uid() = id);  -- or user_id if the PK isn't id

create policy "Users can insert own counselly <tablename>"
  on counselly_<tablename> for insert
  with check (auth.uid() = id);

create policy "Users can update own counselly <tablename>"
  on counselly_<tablename> for update
  using (auth.uid() = id);
```

**Critical notes:**
- `UPDATE` in Postgres RLS also requires a `SELECT` policy — without it, updates silently return 0 rows.
- Never store auth decisions in `user_metadata` — it's user-editable. Use `app_metadata` or a DB column.
- Never expose the `service_role` key in client-side code.
- Views bypass RLS by default. Always use `security_invoker = true` or protect them.

---

## Schema Change Workflow

1. **Iterate freely** using `npx supabase db query --linked "..."` or the Supabase dashboard SQL editor.
2. **When ready to commit** → update `counselly_schema.sql` manually to reflect the change.
3. **Never rename or drop a Lerno column** — even if the name looks generic.
4. **Always check** `DB_STRUCTURE.md` before adding a column to make sure the name isn't already used.

---

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Tables | `counselly_<noun>` (snake_case) | `counselly_essays` |
| Columns | snake_case | `application_cycle` |
| Functions | `counselly_<verb>_<noun>()` | `counselly_set_updated_at()` |
| Triggers | `counselly_<tablename>_<event>` | `counselly_profiles_updated_at` |
| Policies | Human-readable string | `"Users can read own counselly profile"` |

---

## What NOT To Do

- ❌ `ALTER TABLE profiles ...` — Lerno owns this
- ❌ `DROP TABLE study_attempts` — Lerno owns this
- ❌ Writing to any Lerno table from Counselly server actions or API routes
- ❌ Creating a table without RLS enabled
- ❌ Creating a table without the `counselly_` prefix
- ❌ Using the legacy pre-rebrand profiles table — this table has been **deleted**. Use `counselly_profiles`.
- ❌ Storing sensitive auth decisions in `user_metadata`
