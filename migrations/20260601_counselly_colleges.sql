-- counselly_colleges: Public college directory for Counselly.
-- Reference data about ~1000 colleges relevant to Indian students applying internationally.
-- This is a shared reference table — NOT user-specific. RLS allows public read, no user writes.
-- Data is seeded via scripts/seed-colleges.mjs (College Scorecard + manual curation).
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/xiwaeetiolcxqoufsejw/sql/new

create table if not exists counselly_colleges (
  id                      uuid default gen_random_uuid() primary key,

  -- Identity
  name                    text not null,
  slug                    text unique not null,           -- e.g. 'massachusetts-institute-of-technology'
  country                 text not null,                  -- 'USA' | 'UK' | 'Canada' | 'Australia' | 'Singapore' | etc.
  state_province          text,                           -- 'MA' | 'Ontario' | 'New South Wales' | etc.
  city                    text,

  -- Classification
  college_type            text,                           -- 'research_university' | 'liberal_arts' | 'technical' | 'arts' | 'community'
  control                 text,                           -- 'public' | 'private'

  -- Rankings (updated annually — store year alongside)
  qs_rank                 integer,
  qs_rank_year            integer,
  us_news_rank            integer,                        -- US News National Universities / Liberal Arts ranking

  -- Admissions profile
  acceptance_rate         numeric(5,2),                   -- percentage, e.g. 5.40
  test_optional           boolean default false,
  avg_sat_math_25         integer,
  avg_sat_math_75         integer,
  avg_sat_read_25         integer,
  avg_sat_read_75         integer,
  avg_act_25              integer,
  avg_act_75              integer,
  avg_gpa                 numeric(4,2),

  -- Enrollment
  undergrad_enrollment    integer,
  total_enrollment        integer,

  -- Costs (all in USD for comparability)
  annual_tuition_usd      integer,
  annual_cost_usd         integer,                        -- tuition + room + board
  intl_financial_aid      boolean default false,          -- does it award aid to international students?
  avg_intl_aid_usd        integer,                        -- average aid package for intl students

  -- Programs & character
  strong_programs         text[] default '{}',            -- e.g. ['CS', 'Economics', 'Biology']
  tags                    text[] default '{}',            -- e.g. ['ivy-league', 'need-blind-intl', 'stem-heavy', 'small-campus']

  -- Application logistics
  website_url             text,
  application_portal      text,                           -- 'common_app' | 'coalition' | 'ucas' | 'direct' | 'other'
  early_deadline          date,
  regular_deadline        date,

  -- AI-readable content
  description             text,                           -- 2–3 sentence human-readable summary
  notable_facts           text[] default '{}',            -- quick bullets for AI context

  -- Data provenance
  scorecard_id            text,                           -- College Scorecard unit ID (US colleges)
  data_sources            text[] default '{}',            -- ['college_scorecard', 'qs_rankings', 'manual']
  last_updated            date default current_date,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Full-text search index on name (for fast ilike queries)
create index if not exists counselly_colleges_name_idx
  on counselly_colleges using gin (to_tsvector('english', name));

-- B-tree indexes for common filter columns
create index if not exists counselly_colleges_country_idx on counselly_colleges (country);
create index if not exists counselly_colleges_qs_rank_idx on counselly_colleges (qs_rank);
create index if not exists counselly_colleges_acceptance_rate_idx on counselly_colleges (acceptance_rate);
create index if not exists counselly_colleges_slug_idx on counselly_colleges (slug);

-- GIN indexes for array columns
create index if not exists counselly_colleges_tags_idx on counselly_colleges using gin (tags);
create index if not exists counselly_colleges_programs_idx on counselly_colleges using gin (strong_programs);

-- Auto-update updated_at (reuses the existing counselly_set_updated_at() function)
create trigger counselly_colleges_updated_at
  before update on counselly_colleges
  for each row execute procedure counselly_set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Public read: anyone (including unauthenticated users) can browse the directory.
-- No user writes: only the service role (seed script) can insert/update/delete.

alter table counselly_colleges enable row level security;

create policy "Anyone can read counselly colleges"
  on counselly_colleges for select
  using (true);

-- Verify
select count(*) as college_count from counselly_colleges;
