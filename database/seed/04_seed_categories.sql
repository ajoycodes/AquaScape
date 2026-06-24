-- ============================================================
-- SEED: CATEGORIES (self-referencing hierarchy)
-- ============================================================

PROMPT Seeding categories...

-- Top-level
INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Fish', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Fish');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Plants', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Plants');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Equipment', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Equipment');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Tanks', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Tanks');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Decorations', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Decorations');

-- Sub-categories under Fish
INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Freshwater Fish',
       (SELECT category_id FROM categories WHERE category_name = 'Fish')
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Freshwater Fish');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Saltwater Fish',
       (SELECT category_id FROM categories WHERE category_name = 'Fish')
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Saltwater Fish');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Cichlids',
       (SELECT category_id FROM categories WHERE category_name = 'Fish')
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Cichlids');

-- Sub-categories under Plants
INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Stem Plants',
       (SELECT category_id FROM categories WHERE category_name = 'Plants')
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Stem Plants');

INSERT INTO categories (category_id, category_name, parent_id)
SELECT seq_category.NEXTVAL, 'Carpet Plants',
       (SELECT category_id FROM categories WHERE category_name = 'Plants')
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Carpet Plants');

COMMIT;
PROMPT Categories seeded.
