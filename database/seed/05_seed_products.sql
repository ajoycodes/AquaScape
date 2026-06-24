-- ============================================================
-- SEED: PRODUCTS (Tanks, Fish, Plants, Equipment, Decorations)
-- Calls add_product_to_inventory after each product insert.
-- ============================================================

PROMPT Seeding products...

-- ── TANKS ──────────────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'AquaClear 60L Starter Tank', 'TANK',
            'All-in-one 60-litre glass tank with lid, light and filter included.',
            89.99, 42.00,
            (SELECT category_id FROM categories WHERE category_name = 'Tanks'))
    RETURNING product_id INTO v_pid;

    INSERT INTO tanks (tank_id, product_id, volume_liters, length_cm, width_cm, height_cm,
                       material, has_hood)
    VALUES (seq_tank.NEXTVAL, v_pid, 60, 60, 30, 36, 'GLASS', 1);

    add_product_to_inventory(v_pid, 15, 5, 20);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'ProSeries 120L Display Tank', 'TANK',
            'Bow-front 120-litre glass tank, frameless design, LED hood included.',
            219.99, 110.00,
            (SELECT category_id FROM categories WHERE category_name = 'Tanks'))
    RETURNING product_id INTO v_pid;

    INSERT INTO tanks (tank_id, product_id, volume_liters, length_cm, width_cm, height_cm,
                       material, has_hood)
    VALUES (seq_tank.NEXTVAL, v_pid, 120, 90, 45, 50, 'GLASS', 1);

    add_product_to_inventory(v_pid, 8, 3, 10);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'NanoReef 30L Cube', 'TANK',
            'Compact 30-litre acrylic cube, ideal for saltwater nano reef setups.',
            149.99, 70.00,
            (SELECT category_id FROM categories WHERE category_name = 'Tanks'))
    RETURNING product_id INTO v_pid;

    INSERT INTO tanks (tank_id, product_id, volume_liters, length_cm, width_cm, height_cm,
                       material, has_hood)
    VALUES (seq_tank.NEXTVAL, v_pid, 30, 30, 30, 35, 'ACRYLIC', 1);

    add_product_to_inventory(v_pid, 12, 4, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Grand Scape 300L Show Tank', 'TANK',
            '300-litre rimless show tank. Starfire low-iron glass. External sump ready.',
            799.99, 380.00,
            (SELECT category_id FROM categories WHERE category_name = 'Tanks'))
    RETURNING product_id INTO v_pid;

    INSERT INTO tanks (tank_id, product_id, volume_liters, length_cm, width_cm, height_cm,
                       material, has_hood)
    VALUES (seq_tank.NEXTVAL, v_pid, 300, 150, 60, 60, 'GLASS', 0);

    add_product_to_inventory(v_pid, 4, 2, 5);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'BreederPro 200L Rectangular', 'TANK',
            'Heavy-duty 200-litre breeder tank with reinforced bracing.',
            349.99, 160.00,
            (SELECT category_id FROM categories WHERE category_name = 'Tanks'))
    RETURNING product_id INTO v_pid;

    INSERT INTO tanks (tank_id, product_id, volume_liters, length_cm, width_cm, height_cm,
                       material, has_hood)
    VALUES (seq_tank.NEXTVAL, v_pid, 200, 120, 50, 55, 'GLASS', 1);

    add_product_to_inventory(v_pid, 6, 2, 8);
END;
/

-- ── FRESHWATER FISH ────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Neon Tetra', 'FISH',
            'Classic schooling fish with vivid blue-red stripe. Peaceful community fish.',
            3.99, 1.20,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Paracheirodon innesi', 'FRESHWATER',
            22, 26, 6.0, 7.5, 10, 0);

    add_product_to_inventory(v_pid, 120, 20, 100);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Betta Splendens (Male)', 'FISH',
            'Stunning siamese fighting fish. Must be kept alone or with non-fin-nipping species.',
            12.99, 4.50,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Betta splendens', 'FRESHWATER',
            24, 30, 6.5, 8.0, 20, 1);

    add_product_to_inventory(v_pid, 40, 10, 30);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Corydoras Catfish', 'FISH',
            'Hardy bottom-dweller. Excellent scavenger, keeps substrate clean.',
            6.99, 2.80,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Corydoras paleatus', 'FRESHWATER',
            22, 26, 6.0, 7.5, 30, 0);

    add_product_to_inventory(v_pid, 80, 15, 60);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Angelfish', 'FISH',
            'Majestic triangular profile. Semi-aggressive, may eat small fish.',
            14.99, 6.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Pterophyllum scalare', 'FRESHWATER',
            24, 30, 6.0, 7.5, 80, 1);

    add_product_to_inventory(v_pid, 30, 8, 20);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Guppy (Assorted)', 'FISH',
            'Colourful livebearers, easy to breed. Great for beginners.',
            2.99, 0.90,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Poecilia reticulata', 'FRESHWATER',
            22, 28, 7.0, 8.5, 10, 0);

    add_product_to_inventory(v_pid, 200, 30, 150);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Bristlenose Pleco', 'FISH',
            'Algae-eating pleco that stays small. Excellent tank cleaner.',
            9.99, 4.00,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Ancistrus sp.', 'FRESHWATER',
            22, 27, 6.5, 7.5, 50, 0);

    add_product_to_inventory(v_pid, 35, 8, 25);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Zebra Danio', 'FISH',
            'Hardy active schooler. Tolerant of a wide temperature range.',
            2.49, 0.80,
            (SELECT category_id FROM categories WHERE category_name = 'Freshwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Danio rerio', 'FRESHWATER',
            18, 28, 6.5, 7.5, 10, 0);

    add_product_to_inventory(v_pid, 150, 20, 100);
END;
/

-- ── SALTWATER FISH ─────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Ocellaris Clownfish', 'FISH',
            'The iconic "Nemo" fish. Hardy and reef-safe. Great for beginners.',
            24.99, 10.00,
            (SELECT category_id FROM categories WHERE category_name = 'Saltwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Amphiprion ocellaris', 'SALTWATER',
            24, 27, 8.1, 8.4, 80, 0);

    add_product_to_inventory(v_pid, 25, 5, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Blue Tang', 'FISH',
            'The vivid "Dory" fish. Active swimmer, requires 200L+ tank.',
            69.99, 30.00,
            (SELECT category_id FROM categories WHERE category_name = 'Saltwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Paracanthurus hepatus', 'SALTWATER',
            24, 26, 8.1, 8.4, 200, 0);

    add_product_to_inventory(v_pid, 10, 3, 8);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Royal Gramma', 'FISH',
            'Brilliant purple-yellow bicolour. Reef-safe and peaceful.',
            34.99, 14.00,
            (SELECT category_id FROM categories WHERE category_name = 'Saltwater Fish'))
    RETURNING product_id INTO v_pid;

    INSERT INTO fish (fish_id, product_id, species, water_type,
                      min_temp_c, max_temp_c, min_ph, max_ph,
                      min_tank_liters, is_aggressive)
    VALUES (seq_fish.NEXTVAL, v_pid, 'Gramma loreto', 'SALTWATER',
            24, 27, 8.1, 8.4, 75, 0);

    add_product_to_inventory(v_pid, 18, 4, 12);
END;
/

-- ── PLANTS ─────────────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Java Fern', 'PLANT',
            'Hardy low-light fern. Attaches to rocks and driftwood.',
            4.99, 1.50,
            (SELECT category_id FROM categories WHERE category_name = 'Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Microsorum pteropus', 'FRESHWATER',
            20, 28, 'LOW', 0, 'SLOW');

    add_product_to_inventory(v_pid, 60, 10, 50);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Amazon Sword', 'PLANT',
            'Large rosette plant. Bold focal point for midground or background.',
            5.99, 2.00,
            (SELECT category_id FROM categories WHERE category_name = 'Stem Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Echinodorus bleheri', 'FRESHWATER',
            22, 28, 'MEDIUM', 0, 'MEDIUM');

    add_product_to_inventory(v_pid, 45, 8, 40);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Dwarf Hairgrass', 'PLANT',
            'Carpet plant creating a lush grass effect. Requires CO2 and bright light.',
            7.99, 3.00,
            (SELECT category_id FROM categories WHERE category_name = 'Carpet Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Eleocharis parvula', 'FRESHWATER',
            20, 26, 'HIGH', 1, 'MEDIUM');

    add_product_to_inventory(v_pid, 50, 10, 40);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Hornwort', 'PLANT',
            'Fast-growing stem plant. Excellent nitrate absorber. No substrate needed.',
            3.49, 0.90,
            (SELECT category_id FROM categories WHERE category_name = 'Stem Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Ceratophyllum demersum', 'FRESHWATER',
            15, 30, 'LOW', 0, 'FAST');

    add_product_to_inventory(v_pid, 70, 12, 60);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Anubias Barteri', 'PLANT',
            'Shade-tolerant broad-leaf plant. Slow-growing; attach to hardscape.',
            8.99, 3.50,
            (SELECT category_id FROM categories WHERE category_name = 'Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Anubias barteri', 'FRESHWATER',
            22, 28, 'LOW', 0, 'SLOW');

    add_product_to_inventory(v_pid, 40, 8, 30);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Rotala Rotundifolia', 'PLANT',
            'Beautiful pink-red stem plant. Great colour contrast in planted tanks.',
            4.49, 1.40,
            (SELECT category_id FROM categories WHERE category_name = 'Stem Plants'))
    RETURNING product_id INTO v_pid;

    INSERT INTO plants (plant_id, product_id, species, water_type,
                        min_temp_c, max_temp_c, light_requirement,
                        co2_required, growth_rate)
    VALUES (seq_plant.NEXTVAL, v_pid, 'Rotala rotundifolia', 'FRESHWATER',
            20, 28, 'MEDIUM', 1, 'FAST');

    add_product_to_inventory(v_pid, 55, 10, 50);
END;
/

-- ── EQUIPMENT ──────────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'AquaClear 50 HOB Filter', 'EQUIPMENT',
            'Hang-on-back filter for tanks up to 200L. Adjustable flow rate.',
            49.99, 22.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'FILTER', 7, 200, 'AquaClear');

    add_product_to_inventory(v_pid, 25, 5, 20);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Eheim Classic 2215 Canister Filter', 'EQUIPMENT',
            'External canister filter, whisper-quiet, 350L/h flow rate.',
            119.99, 55.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'FILTER', 15, 350, 'Eheim');

    add_product_to_inventory(v_pid, 15, 4, 12);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Fluval E300 Heater', 'EQUIPMENT',
            '300W heater with digital display, fast response dual sensors.',
            59.99, 26.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'HEATER', 300, 300, 'Fluval');

    add_product_to_inventory(v_pid, 20, 5, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'LED Planted Tank Light 60cm', 'EQUIPMENT',
            'Full-spectrum LED, programmable sunrise/sunset, Bluetooth app control.',
            79.99, 35.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'LIGHT', 30, 120, 'AquaIllumination');

    add_product_to_inventory(v_pid, 18, 4, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'CO2 Diffuser Kit', 'EQUIPMENT',
            'Pressurised CO2 system with regulator, ceramic diffuser and bubble counter.',
            89.99, 40.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'CO2_SYSTEM', 0, 250, 'Sera');

    add_product_to_inventory(v_pid, 12, 3, 10);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'ATO Auto Top-Off Unit', 'EQUIPMENT',
            'Automatic water top-off to compensate for evaporation. Dual sensor safety.',
            69.99, 30.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'OTHER', 8, 500, 'AutoAqua');

    add_product_to_inventory(v_pid, 10, 3, 8);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Sump Pump 2000 L/H', 'EQUIPMENT',
            'Return pump for sump-based systems. Energy efficient DC motor.',
            54.99, 24.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'PUMP', 30, 600, 'Jebao');

    add_product_to_inventory(v_pid, 14, 4, 12);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Wave Maker 5000 L/H', 'EQUIPMENT',
            'Powerhead creating natural wave motion. Ideal for coral and reef setups.',
            39.99, 17.00,
            (SELECT category_id FROM categories WHERE category_name = 'Equipment'))
    RETURNING product_id INTO v_pid;

    INSERT INTO equipment (equipment_id, product_id, equipment_type,
                           power_watts, suitable_liters_min, brand)
    VALUES (seq_equipment.NEXTVAL, v_pid, 'PUMP', 18, 400, 'Tunze');

    add_product_to_inventory(v_pid, 20, 5, 15);
END;
/

-- ── DECORATIONS ────────────────────────────────────────────
DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Natural Driftwood (Medium)', 'DECORATION',
            'Aquarium-safe Malaysian driftwood. Pre-soaked and boiled.',
            18.99, 7.00,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'DRIFTWOOD', 'WOOD', 1, 'FRESHWATER');

    add_product_to_inventory(v_pid, 22, 5, 18);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Dragon Stone Rock (1kg)', 'DECORATION',
            'Porous volcanic rock with dramatic ridges. Safe for all water types.',
            12.99, 5.00,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'ROCK', 'ROCK', 1, 'BOTH');

    add_product_to_inventory(v_pid, 35, 6, 30);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Sunken Pirate Ship', 'DECORATION',
            'Ceramic ornament with hidden cave for shy fish.',
            14.49, 5.50,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'CASTLE', 'CERAMIC', 0, 'BOTH');

    add_product_to_inventory(v_pid, 18, 4, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Substrate Sand (5kg Neutral)', 'DECORATION',
            'Fine natural sand, pH neutral. Suitable for freshwater and marine.',
            16.99, 6.50,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'SUBSTRATE', 'SAND', 1, 'BOTH');

    add_product_to_inventory(v_pid, 50, 8, 40);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Coral Skeleton Decor', 'DECORATION',
            'Replica coral formation. pH neutral resin, safe for marine tanks.',
            21.99, 9.00,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'CORAL', 'RESIN', 0, 'BOTH');

    add_product_to_inventory(v_pid, 20, 4, 15);
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    INSERT INTO products (product_id, product_name, product_type, description,
                          unit_price, cost_price, category_id)
    VALUES (seq_product.NEXTVAL, 'Terracotta Pot (Cave)', 'DECORATION',
            'Unglazed terracotta pot for bottom-dweller breeding and hiding.',
            3.99, 1.20,
            (SELECT category_id FROM categories WHERE category_name = 'Decorations'))
    RETURNING product_id INTO v_pid;

    INSERT INTO decorations (decoration_id, product_id, deco_type, material, is_natural, safe_water_type)
    VALUES (seq_deco.NEXTVAL, v_pid, 'CAVE', 'CERAMIC', 0, 'FRESHWATER');

    add_product_to_inventory(v_pid, 60, 10, 50);
END;
/

-- ── DISCOUNTS ──────────────────────────────────────────────
INSERT INTO discounts (discount_id, code, discount_type, value, max_uses, used_count, valid_from, valid_until)
SELECT seq_discount.NEXTVAL, 'WELCOME10', 'PERCENT', 10, 200, 0, SYSDATE, ADD_MONTHS(SYSDATE, 12)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'WELCOME10');

INSERT INTO discounts (discount_id, code, discount_type, value, max_uses, used_count, valid_from, valid_until)
SELECT seq_discount.NEXTVAL, 'SAVE20', 'FIXED', 20, 50, 0, SYSDATE, ADD_MONTHS(SYSDATE, 6)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'SAVE20');

INSERT INTO discounts (discount_id, code, discount_type, value, max_uses, used_count, valid_from, valid_until)
SELECT seq_discount.NEXTVAL, 'REEF15', 'PERCENT', 15, 30, 0, SYSDATE, ADD_MONTHS(SYSDATE, 3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'REEF15');

COMMIT;
PROMPT Products seeded.
