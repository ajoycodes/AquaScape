-- Extra products chosen to trigger the compatibility checks:
-- water-type blocks (puffer, chaeto, live rock), temperature fails
-- (goldfish, discus), capacity fail (oscar) and pairwise rules
-- (tiger barb, cherry shrimp).

PROMPT Seeding demo variety products...

-- Fancy Goldfish - coldwater, fails temp check in tropical setups
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Fancy Goldfish', 'FISH',
            'Classic coldwater fish. NOT suited to tropical tanks - needs 18-22 C.',
            7.99, 2.50,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Carassius auratus', 'Fancy Goldfish', 'FRESHWATER',
            18, 22, 7.0, 8.0, 75, 0, 'EASY');

    add_product_to_inventory(v_pid, 45, 10, 40);
END;
/

-- Blue Diamond Discus - needs very warm water (28-31 C)
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Blue Diamond Discus', 'FISH',
            'Stunning show fish. Demands warm, soft water at 28-31 C - expert only.',
            89.99, 40.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Symphysodon aequifasciatus', 'Discus', 'FRESHWATER',
            28, 31, 5.5, 6.8, 150, 0, 'HARD');

    add_product_to_inventory(v_pid, 8, 3, 10);
END;
/

-- Figure-8 Puffer - BRACKISH water, blocked in fresh AND salt setups
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Figure-8 Puffer', 'FISH',
            'Charismatic brackish puffer. Requires brackish water - neither pure fresh nor marine.',
            18.99, 8.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Dichotomyctere ocellatus', 'Figure-8 Puffer', 'BRACKISH',
            24, 28, 7.5, 8.3, 60, 1, 'MEDIUM');

    add_product_to_inventory(v_pid, 12, 4, 12);
END;
/

-- Oscar Cichlid - huge, aggressive, needs ~200L per fish
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Oscar Cichlid', 'FISH',
            'Intelligent giant with personality. Eats anything that fits in its mouth. 200L minimum.',
            24.99, 10.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, max_fish_per_liter, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Astronotus ocellatus', 'Oscar', 'FRESHWATER',
            23, 28, 6.0, 7.5, 200, 0.005, 1, 'MEDIUM');

    add_product_to_inventory(v_pid, 10, 3, 10);
END;
/

-- Tiger Barb - notorious fin nipper, pairwise conflicts
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Tiger Barb', 'FISH',
            'Striking striped schooler - but a relentless fin nipper of long-finned tankmates.',
            4.49, 1.50,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Puntigrus tetrazona', 'Tiger Barb', 'FRESHWATER',
            22, 27, 6.0, 7.5, 60, 1, 'EASY');

    add_product_to_inventory(v_pid, 60, 15, 50);
END;
/

-- Cherry Shrimp - everyone's lunch, pairwise prey rules
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Cherry Shrimp (5-pack)', 'FISH',
            'Vivid red dwarf shrimp. Superb algae crew - but easy prey for larger fish.',
            9.99, 3.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, common_name, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive, care_level)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Neocaridina davidi', 'Cherry Shrimp', 'FRESHWATER',
            18, 27, 6.5, 8.0, 10, 0, 'EASY');

    add_product_to_inventory(v_pid, 80, 20, 60);
END;
/

-- Chaeto Macroalgae - SALTWATER plant, blocked in freshwater
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Chaeto Macroalgae', 'PLANT',
            'Marine macroalgae ball for refugiums. Exports nutrients in saltwater systems only.',
            12.99, 4.00,
            (SELECT category_id FROM categories WHERE category_name = 'Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, common_name, water_type,
                        light_requirement, co2_required, growth_rate, placement)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Chaetomorpha linum', 'Chaeto', 'SALTWATER',
            'MEDIUM', 0, 'FAST', 'FLOATING');

    add_product_to_inventory(v_pid, 25, 6, 20);
END;
/

-- Live Rock - SALTWATER-only decoration, fails water check in fresh
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Cured Live Rock (2kg)', 'DECORATION',
            'Biologically active reef rock. Raises pH and hardness - marine systems only.',
            34.99, 15.00,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material,
                             is_natural, safe_water_type, size_class)
    VALUES (seq_deco.NEXTVAL, v_pid, 'ROCK', 'Aragonite', 1, 'SALTWATER', 'MEDIUM');

    add_product_to_inventory(v_pid, 18, 5, 15);
END;
/

-- PAIRWISE COMPATIBILITY RULES

-- Oscar eats every small fish and invertebrate
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Oscar Cichlid'),
    (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'),
    'INCOMPATIBLE', 'ERROR',
    'Oscars swallow neon tetras whole. Predator-prey size mismatch.');

INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Oscar Cichlid'),
    (SELECT product_id FROM products WHERE product_name = 'Guppy (Assorted)'),
    'INCOMPATIBLE', 'ERROR',
    'Guppies are live food to an Oscar. Fatal within hours.');

INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Oscar Cichlid'),
    (SELECT product_id FROM products WHERE product_name = 'Cherry Shrimp (5-pack)'),
    'INCOMPATIBLE', 'ERROR',
    'Shrimp are a natural snack for large cichlids.');

INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Oscar Cichlid'),
    (SELECT product_id FROM products WHERE product_name = 'Zebra Danio'),
    'INCOMPATIBLE', 'ERROR',
    'Small danios will be hunted down by an adult Oscar.');

-- Tiger Barb shreds long-finned fish
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Tiger Barb'),
    (SELECT product_id FROM products WHERE product_name = 'Betta Splendens (Male)'),
    'INCOMPATIBLE', 'ERROR',
    'Tiger barbs relentlessly nip betta fins - severe stress and infection risk.');

INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Tiger Barb'),
    (SELECT product_id FROM products WHERE product_name = 'Angelfish'),
    'INCOMPATIBLE', 'ERROR',
    'Barbs shred the trailing fins of angelfish.');

INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Tiger Barb'),
    (SELECT product_id FROM products WHERE product_name = 'Guppy (Assorted)'),
    'INCOMPATIBLE', 'ERROR',
    'Fancy guppy fins are irresistible targets for tiger barbs.');

-- Angelfish hunt shrimp
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Angelfish'),
    (SELECT product_id FROM products WHERE product_name = 'Cherry Shrimp (5-pack)'),
    'INCOMPATIBLE', 'ERROR',
    'Angelfish actively hunt dwarf shrimp.');

COMMIT;

PROMPT Demo variety seeded - 8 products, 8 pairwise rules.
