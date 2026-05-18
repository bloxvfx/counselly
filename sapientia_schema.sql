-- Sapientia-specific user profiles.
-- Separate from Lerno's `profiles` table — do NOT touch that table.
-- Uses the same Supabase auth.users pool so existing Lerno accounts work seamlessly.

create table if not exists sapientia_profiles (
  id               uuid references auth.users on delete cascade not null primary key,
  email            text,
  full_name        text,
  -- Onboarding step 1
  grade            text,           -- '11' | '12' | 'gap_year' | 'applied'
  -- Onboarding step 2
  target_countries text[],         -- e.g. ['US', 'UK', 'Canada']
  intended_major   text,           -- e.g. 'Engineering & CS'
  -- Onboarding step 3
  test_plans       jsonb,          -- { sat: true, act: false, ielts: true, toefl: false }
  application_cycle text,          -- '2025-26' | '2026-27' | '2027-28' | 'unsure'
  -- Status
  onboarding_completed boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table sapientia_profiles enable row level security;

create policy "Users can read own sapientia profile"
  on sapientia_profiles for select
  using (auth.uid() = id);

create policy "Users can insert own sapientia profile"
  on sapientia_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own sapientia profile"
  on sapientia_profiles for update
  using (auth.uid() = id);

-- Keep updated_at current automatically
create or replace function sapientia_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sapientia_profiles_updated_at
  before update on sapientia_profiles
  for each row execute procedure sapientia_set_updated_at();
