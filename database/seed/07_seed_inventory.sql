-- ============================================================
-- SEED: INVENTORY ADJUSTMENTS & MOVEMENTS
-- Simulates some prior stock activity to populate movement log.
-- ============================================================

PROMPT Seeding inventory history...

-- Simulate a few purchase receipts to populate movement history
-- (update_inventory handles movement logging automatically)

DECLARE
    -- Neon Tetra bulk purchase
    v_neon_id NUMBER;
BEGIN
    SELECT product_id INTO v_neon_id
    FROM products WHERE product_name = 'Neon Tetra';

    update_inventory(
        p_product_id => v_neon_id,
        p_delta      => 50,
        p_move_type  => 'PURCHASE',
        p_ref_type   => 'ADJUSTMENT',
        p_user_id    => 1,
        p_notes      => 'Initial stock purchase — OceanBreeze batch'
    );
END;
/

DECLARE
    v_guppy_id NUMBER;
BEGIN
    SELECT product_id INTO v_guppy_id
    FROM products WHERE product_name = 'Guppy (Assorted)';

    update_inventory(
        p_product_id => v_guppy_id,
        p_delta      => 100,
        p_move_type  => 'PURCHASE',
        p_ref_type   => 'ADJUSTMENT',
        p_user_id    => 1,
        p_notes      => 'Restocking guppies from FreshWater Direct'
    );
END;
/

DECLARE
    v_clown_id NUMBER;
BEGIN
    SELECT product_id INTO v_clown_id
    FROM products WHERE product_name = 'Ocellaris Clownfish';

    update_inventory(
        p_product_id => v_clown_id,
        p_delta      => 10,
        p_move_type  => 'PURCHASE',
        p_ref_type   => 'ADJUSTMENT',
        p_user_id    => 1,
        p_notes      => 'Saltwater stock top-up'
    );
END;
/

DECLARE
    v_pid NUMBER;
BEGIN
    SELECT product_id INTO v_pid
    FROM products WHERE product_name = 'Java Fern';

    update_inventory(
        p_product_id => v_pid,
        p_delta      => 30,
        p_move_type  => 'PURCHASE',
        p_ref_type   => 'ADJUSTMENT',
        p_user_id    => 2,
        p_notes      => 'Plant restock from AquaPlant Solutions'
    );
END;
/

-- Simulate damaged stock write-off
DECLARE
    v_pid NUMBER;
BEGIN
    SELECT product_id INTO v_pid
    FROM products WHERE product_name = 'Bristlenose Pleco';

    update_inventory(
        p_product_id => v_pid,
        p_delta      => -3,
        p_move_type  => 'DAMAGE',
        p_ref_type   => 'ADJUSTMENT',
        p_user_id    => 2,
        p_notes      => 'DOA — 3 fish written off on arrival'
    );
END;
/

COMMIT;
PROMPT Inventory history seeded.
