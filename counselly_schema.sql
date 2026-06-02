-- counselly_profiles: Counselly-specific onboarding and user profile data.
-- This is the ONLY Counselly-owned table in the shared Supabase instance.
-- Separate from Lerno's `profiles` table — never touch Lerno tables.
-- Lerno accounts (auth.users) work seamlessly — no new user creation needed.
-- See DB_RULES.md and DB_STRUCTURE.md for full context.
-- Last updated: 2026-05-29

create table if not exists counselly_profiles (
  id                       uuid references auth.users on delete cascade not null primary key,
  email                    text,
  full_name                text,
  -- Step 0: About you
  grade                    text,           -- '9' | '10' | '11' | '12' | 'gap_year' | 'applied'
  board                    text,           -- 'CBSE' | 'ICSE_ISC' | 'IB' | 'Cambridge' | 'State Board' | 'Other'
  -- Step 1: Targets
  target_countries         text[],         -- e.g. ['USA', 'UK', 'Canada']
  intended_major           text,           -- e.g. 'Engineering & CS'
  india_track              text,           -- 'jee' | 'neet' | 'holistic' | 'unsure' | null (only relevant if 'India' in target_countries)
  -- Step 2: Academic profile
  academic_score           text,           -- raw string, e.g. '92' or '9.2'
  score_type               text default 'percentage', -- 'percentage' | 'cgpa_10' | 'cgpa_4' | 'ib'
  subject_scores           jsonb,          -- { "Physics": "94", "Maths": "97" } — used for UK/Germany subject requirements
  predicted_grades         jsonb,          -- { "Physics": "A*", "Maths": "A" } — UCAS predicted grades
  tests_taken              text[],         -- legacy flat list, superseded by counselly_test_scores table
  tests_planned            text[],         -- legacy flat list, superseded by counselly_test_scores table
  -- Language proficiency (Germany / Netherlands)
  language_proficiency     text,           -- 'none' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'
  language_test_taken      text,           -- 'TestDaF' | 'DSH' | 'IELTS' | 'NT2' | null
  language_test_score      text,
  -- Step 3: Application preferences
  application_cycle        text,           -- '2025-26' | '2026-27' | '2027-28' | 'unsure'
  financial_aid_importance text,           -- 'critical' | 'helpful' | 'not_needed'
  college_type_preference  text[],
  activities               text[],         -- legacy category tags, superseded by counselly_activities table
  help_needed              text[],         -- e.g. ['Building my college list', 'Writing application essays']
  college_list_context     jsonb default '{}'::jsonb, -- AI-guided college list discovery preferences & stage
  -- Optional personal info (profile page — not collected in onboarding)
  personal_details         jsonb,          -- preferred_name, pronouns, gender, dob, location, timezone, phone, bio, etc.
  -- Status
  onboarding_completed     boolean default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

alter table counselly_profiles enable row level security;

create policy "Users can read own counselly profile"
  on counselly_profiles for select
  using (auth.uid() = id);

create policy "Users can insert own counselly profile"
  on counselly_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own counselly profile"
  on counselly_profiles for update
  using (auth.uid() = id);

-- Keep updated_at current automatically
create or replace function counselly_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger counselly_profiles_updated_at
  before update on counselly_profiles
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_test_scores: Structured test score records, one row per attempt.
-- Replaces the flat tests_taken[] / tests_planned[] arrays on counselly_profiles.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_test_scores (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,

  -- test_name allowed values:
  -- 'SAT' | 'ACT' | 'IELTS' | 'TOEFL' | 'DUOLINGO'
  -- 'JEE_MAINS' | 'JEE_ADVANCED' | 'NEET' | 'ATAR'
  -- 'IB_PREDICTED' | 'IB_FINAL' | 'AP' | 'A_LEVEL' | 'IGCSE'
  -- 'MAT' | 'STEP' | 'TSA'
  -- 'TestDaF' | 'DSH' | 'NT2'
  -- 'GRE' | 'OTHER'
  test_name      text not null,

  -- 'taken' | 'planned' | 'registered'
  status         text not null default 'taken',

  -- Score fields — structure varies by test, documented below
  -- SAT:          { "math": 780, "reading_writing": 700 }
  -- ACT:          { "english": 35, "math": 34, "reading": 36, "science": 35 }
  -- IELTS:        { "listening": 8.0, "reading": 7.5, "writing": 7.0, "speaking": 7.5 }
  -- JEE_MAINS:    { "physics": 95, "chemistry": 90, "maths": 100, "percentile": 99.4 }
  -- JEE_ADVANCED: { "physics": 78, "chemistry": 64, "maths": 82, "total": 224, "air": 412 }
  -- NEET:         { "physics": 160, "chemistry": 150, "biology": 340 }
  total_score    text,
  section_scores jsonb,

  test_date      date,
  planned_date   date,
  attempt_number integer default 1,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table counselly_test_scores enable row level security;

create policy "Users can read own counselly test scores"
  on counselly_test_scores for select using (auth.uid() = user_id);

create policy "Users can insert own counselly test scores"
  on counselly_test_scores for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly test scores"
  on counselly_test_scores for update using (auth.uid() = user_id);

create policy "Users can delete own counselly test scores"
  on counselly_test_scores for delete using (auth.uid() = user_id);

create trigger counselly_test_scores_updated_at
  before update on counselly_test_scores
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_activities: Structured extracurricular activities.
-- Common App-compatible structure. Replaces activities text[] on profile.
-- Relevant for: USA (T1), Canada (T2), Singapore (T2), India_Holistic (T1).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_activities (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,

  -- activity_type: 'Athletics' | 'Club/Organization' | 'Community Service'
  -- | 'Family Responsibilities' | 'Foreign Exchange' | 'Internship'
  -- | 'Research' | 'Work' | 'Other'
  activity_type  text not null,
  name           text not null,
  organization   text,
  position       text,
  description    text,           -- 150-char limit for Common App
  is_leadership  boolean default false,
  hours_per_week integer,
  weeks_per_year integer,

  -- Which grades the student participated
  grade_9        boolean default false,
  grade_10       boolean default false,
  grade_11       boolean default false,
  grade_12       boolean default false,

  continued_in_college boolean default false,
  sort_order     integer default 0,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table counselly_activities enable row level security;

create policy "Users can read own counselly activities"
  on counselly_activities for select using (auth.uid() = user_id);

create policy "Users can insert own counselly activities"
  on counselly_activities for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly activities"
  on counselly_activities for update using (auth.uid() = user_id);

create policy "Users can delete own counselly activities"
  on counselly_activities for delete using (auth.uid() = user_id);

create trigger counselly_activities_updated_at
  before update on counselly_activities
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_honors: Competitions, awards, and academic honors.
-- Relevant for: USA (T1), UK/Canada/Singapore/India_Holistic (T2).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_honors (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,

  title             text not null,
  field             text,           -- e.g. 'Mathematics' | 'Computing & Technology' | 'Science'
  issuing_org       text,           -- e.g. 'AMC / MAA', 'CBSE', 'Google'
  level             text,           -- 'school' | 'district' | 'state' | 'national' | 'international'
  recognition_level text,           -- Common App: 'school' | 'state/regional' | 'national' | 'international'
  year              text,           -- e.g. '2024'
  grade             text,           -- '9' | '10' | '11' | '12'
  status            text default 'participated', -- 'planned' | 'participated' | 'placed' | 'won'
  award             text,           -- e.g. '1st Place', 'Gold Medal', 'Finalist', 'Certificate of Merit'
  description       text,           -- what the student accomplished

  sort_order        integer default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table counselly_honors enable row level security;

create policy "Users can read own counselly honors"
  on counselly_honors for select using (auth.uid() = user_id);

create policy "Users can insert own counselly honors"
  on counselly_honors for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly honors"
  on counselly_honors for update using (auth.uid() = user_id);

create policy "Users can delete own counselly honors"
  on counselly_honors for delete using (auth.uid() = user_id);

create trigger counselly_honors_updated_at
  before update on counselly_honors
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_essays: Essay and personal statement drafts.
-- Content is stored here so the AI counsellor can read it directly.
-- Relevant for: USA/UK/India_Holistic (T1), Canada (T2).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_essays (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,

  -- essay_type: 'common_app_main' | 'coalition_main' | 'ucas_ps'
  -- | 'supplemental' | 'scholarship' | 'other'
  essay_type     text not null,
  college_name   text,           -- null for Common App main / UCAS PS (used by all colleges)
  prompt         text,
  prompt_label   text,           -- short label e.g. "Why Us", "Diversity"
  word_limit     integer,

  content        text,
  word_count     integer,

  -- status: 'not_started' | 'brainstorming' | 'drafting' | 'revising' | 'final'
  status         text not null default 'not_started',
  notes          text,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table counselly_essays enable row level security;

create policy "Users can read own counselly essays"
  on counselly_essays for select using (auth.uid() = user_id);

create policy "Users can insert own counselly essays"
  on counselly_essays for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly essays"
  on counselly_essays for update using (auth.uid() = user_id);

create policy "Users can delete own counselly essays"
  on counselly_essays for delete using (auth.uid() = user_id);

create trigger counselly_essays_updated_at
  before update on counselly_essays
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_recommendations: Recommendation letter tracking.
-- Relevant for: USA (T1), Canada/Singapore/India_Holistic (T2), UK (T3).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_recommendations (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,

  recommender_name   text not null,
  -- recommender_role: 'Subject Teacher' | 'School Counsellor' | 'Research Supervisor' | 'Employer' | 'Other'
  recommender_role   text,
  subject            text,
  relationship       text,

  -- status: 'to_ask' | 'asked' | 'committed' | 'submitted'
  status             text not null default 'to_ask',
  asked_date         date,
  due_date           date,
  target_colleges    text[],
  notes              text,

  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table counselly_recommendations enable row level security;

create policy "Users can read own counselly recommendations"
  on counselly_recommendations for select using (auth.uid() = user_id);

create policy "Users can insert own counselly recommendations"
  on counselly_recommendations for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly recommendations"
  on counselly_recommendations for update using (auth.uid() = user_id);

create policy "Users can delete own counselly recommendations"
  on counselly_recommendations for delete using (auth.uid() = user_id);

create trigger counselly_recommendations_updated_at
  before update on counselly_recommendations
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_college_list: The student's tracked college shortlist.
-- Country field drives which metadata columns and deadline types are shown.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_college_list (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references auth.users(id) on delete cascade not null,

  college_name         text not null,
  country              text not null,
  program              text,

  -- tier: 'reach' | 'target' | 'safety' | 'exam-cutoff' (JEE/NEET rank-based)
  tier                 text,

  -- status: 'researching' | 'applying' | 'applied' | 'interview'
  -- | 'offer' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
  status               text not null default 'researching',

  application_deadline date,
  decision_date        date,
  -- portal_name: 'Common App' | 'UCAS' | 'JoSAA' | 'MCC' | 'Uni-Assist' | 'Studielink' | 'Direct'
  portal_name          text,
  portal_link          text,

  notes                text,
  sort_order           integer default 0,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table counselly_college_list enable row level security;

create policy "Users can read own counselly college list"
  on counselly_college_list for select using (auth.uid() = user_id);

create policy "Users can insert own counselly college list"
  on counselly_college_list for insert with check (auth.uid() = user_id);

create policy "Users can update own counselly college list"
  on counselly_college_list for update using (auth.uid() = user_id);

create policy "Users can delete own counselly college list"
  on counselly_college_list for delete using (auth.uid() = user_id);

create trigger counselly_college_list_updated_at
  before update on counselly_college_list
  for each row execute procedure counselly_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- counselly_colleges: Public college directory (~1000 colleges).
-- Reference data — not user-specific. RLS allows public read (no auth required).
-- Seeded via scripts/seed-colleges.mjs (College Scorecard + manual curation).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists counselly_colleges (
  id                      uuid default gen_random_uuid() primary key,
  name                    text not null,
  slug                    text unique not null,
  country                 text not null,
  state_province          text,
  city                    text,
  college_type            text,
  control                 text,
  qs_rank                 integer,
  qs_rank_year            integer,
  us_news_rank            integer,
  acceptance_rate         numeric(5,2),
  test_optional           boolean default false,
  avg_sat_math_25         integer,
  avg_sat_math_75         integer,
  avg_sat_read_25         integer,
  avg_sat_read_75         integer,
  avg_act_25              integer,
  avg_act_75              integer,
  avg_gpa                 numeric(4,2),
  undergrad_enrollment    integer,
  total_enrollment        integer,
  annual_tuition_usd      integer,
  annual_cost_usd         integer,
  intl_financial_aid      boolean default false,
  avg_intl_aid_usd        integer,
  strong_programs         text[] default '{}',
  tags                    text[] default '{}',
  website_url             text,
  application_portal      text,
  early_deadline          date,
  regular_deadline        date,
  description             text,
  notable_facts           text[] default '{}',
  scorecard_id            text,
  data_sources            text[] default '{}',
  last_updated            date default current_date,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists counselly_colleges_name_idx on counselly_colleges using gin (to_tsvector('english', name));
create index if not exists counselly_colleges_country_idx on counselly_colleges (country);
create index if not exists counselly_colleges_qs_rank_idx on counselly_colleges (qs_rank);
create index if not exists counselly_colleges_acceptance_rate_idx on counselly_colleges (acceptance_rate);
create index if not exists counselly_colleges_slug_idx on counselly_colleges (slug);
create index if not exists counselly_colleges_tags_idx on counselly_colleges using gin (tags);
create index if not exists counselly_colleges_programs_idx on counselly_colleges using gin (strong_programs);

create trigger counselly_colleges_updated_at
  before update on counselly_colleges
  for each row execute procedure counselly_set_updated_at();

alter table counselly_colleges enable row level security;

create policy "Anyone can read counselly colleges"
  on counselly_colleges for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration (existing databases): see migrations/
-- ─────────────────────────────────────────────────────────────────────────────
-- alter table counselly_profiles add column if not exists personal_details jsonb;
-- alter table counselly_profiles add column if not exists india_track text;
-- alter table counselly_profiles add column if not exists college_list_context jsonb default '{}'::jsonb;
