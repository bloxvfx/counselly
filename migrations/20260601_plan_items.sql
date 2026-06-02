-- Plan feature: user-defined categories and plan items
-- Created: 2026-06-01

CREATE TABLE counselly_plan_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT 'blue',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE counselly_plan_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON counselly_plan_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE counselly_plan_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES counselly_plan_categories(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  notes       TEXT,
  type        TEXT NOT NULL DEFAULT 'task'
                CHECK (type IN ('task', 'goal', 'milestone', 'event')),
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started', 'in_progress', 'done', 'cancelled', 'blocked')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date    DATE,
  start_date  DATE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE counselly_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON counselly_plan_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
