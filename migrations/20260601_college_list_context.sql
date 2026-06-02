-- Store preferences gathered during the AI-guided college list builder.
alter table counselly_profiles
  add column if not exists college_list_context jsonb default '{}'::jsonb;
