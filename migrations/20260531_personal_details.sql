-- Counselly: personal info + related profile columns (safe on existing DBs)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/xiwaeetiolcxqoufsejw/sql/new
--
-- Personal info (profile → Personal Information tab) is stored in personal_details (jsonb).
-- No new table. Existing RLS on counselly_profiles already covers SELECT/UPDATE for auth.uid() = id.

-- Required for personal info saves
alter table counselly_profiles
  add column if not exists personal_details jsonb;

comment on column counselly_profiles.personal_details is
  'Optional: preferred_pronouns, gender, date_of_birth, location, phone, bio, linkedin_url, avatar_color';

-- Recommended (avoids dashboard/layout query failures if missing)
alter table counselly_profiles
  add column if not exists india_track text;

comment on column counselly_profiles.india_track is
  'jee | neet | holistic | unsure — only when India is in target_countries';

-- Verify
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'counselly_profiles'
  and column_name in ('personal_details', 'india_track')
order by column_name;
