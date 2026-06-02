-- Add richer columns to counselly_honors table
alter table counselly_honors add column if not exists field text;
alter table counselly_honors add column if not exists issuing_org text;
alter table counselly_honors add column if not exists status text default 'participated';
alter table counselly_honors add column if not exists award text;
alter table counselly_honors add column if not exists description text;
