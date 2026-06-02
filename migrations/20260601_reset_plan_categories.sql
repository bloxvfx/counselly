-- Reset plan categories to the correct defaults:
-- Keep only: Extracurriculars (green), Academics (blue), Tests (teal), Other (grey)
-- Remove: Test Prep, Applications, Essays, Scholarships

-- 1. Delete stale default categories (items using them will have category_id set to NULL via ON DELETE SET NULL)
DELETE FROM counselly_plan_categories
WHERE name IN ('Test Prep', 'Applications', 'Essays', 'Scholarships');

-- 2. Rename/recolour existing categories that should stay
UPDATE counselly_plan_categories SET name = 'Extracurriculars' WHERE name = 'Extracurricular';
UPDATE counselly_plan_categories SET name = 'Tests'            WHERE name = 'Test';
UPDATE counselly_plan_categories SET color = 'grey'            WHERE name = 'Other';

-- 3. Insert Academics for any user who doesn't have it yet
INSERT INTO counselly_plan_categories (user_id, name, color, sort_order)
SELECT DISTINCT user_id, 'Academics', 'blue', 1
FROM counselly_plan_categories
WHERE user_id NOT IN (
  SELECT user_id FROM counselly_plan_categories WHERE name = 'Academics'
);

-- 4. Normalise sort_order for the four kept categories
-- (cosmetic; not critical)
UPDATE counselly_plan_categories SET sort_order = 0 WHERE name = 'Extracurriculars';
UPDATE counselly_plan_categories SET sort_order = 1 WHERE name = 'Academics';
UPDATE counselly_plan_categories SET sort_order = 2 WHERE name = 'Tests';
UPDATE counselly_plan_categories SET sort_order = 3 WHERE name = 'Other';
