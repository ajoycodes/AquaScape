-- ============================================================
-- MODULE 7: PL/SQL FUNCTIONS
-- All functions return scalar values used by procedures,
-- triggers, views, and the API layer.
-- ============================================================

-- ============================================================
-- FUNCTION: check_compatibility
-- Returns the count of HARD (ERROR-severity) compatibility
-- conflicts between a candidate product and all items
-- already in the given setup.
-- Returns 0 = safe to add | >0 = conflicts exist
-- ============================================================
CREATE OR REPLACE FUNCTION check_compatibility (
    p_setup_id      IN NUMBER,
    p_product_id    IN NUMBER
) RETURN NUMBER AS
    v_conflicts NUMBER := 0;
BEGIN
    -- Check all existing setup items against compatibility_rules
    SELECT COUNT(*)
    INTO   v_conflicts
    FROM   setup_items      si
    JOIN   compatibility_rules cr
        ON (    (cr.product_id_a = si.product_id AND cr.product_id_b = p_product_id)
             OR (cr.product_id_b = si.product_id AND cr.product_id_a = p_product_id) )
    WHERE  si.setup_id   = p_setup_id
      AND  cr.rule_type  = 'INCOMPATIBLE'
      AND  cr.severity   = 'ERROR';

    RETURN v_conflicts;

EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END check_compatibility;
/

-- ============================================================
-- FUNCTION: get_compatibility_warnings
-- Returns WARNING-level conflicts (informational, not blocking).
-- ============================================================
CREATE OR REPLACE FUNCTION get_compatibility_warnings (
    p_setup_id      IN NUMBER,
    p_product_id    IN NUMBER
) RETURN NUMBER AS
    v_warnings NUMBER := 0;
BEGIN
    SELECT COUNT(*)
    INTO   v_warnings
    FROM   setup_items      si
    JOIN   compatibility_rules cr
        ON (    (cr.product_id_a = si.product_id AND cr.product_id_b = p_product_id)
             OR (cr.product_id_b = si.product_id AND cr.product_id_a = p_product_id) )
    WHERE  si.setup_id   = p_setup_id
      AND  cr.rule_type  = 'INCOMPATIBLE'
      AND  cr.severity   = 'WARNING';

    RETURN v_warnings;

EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END get_compatibility_warnings;
/

-- ============================================================
-- FUNCTION: validate_tank_capacity
-- Returns 1 if stocking density is within limits, 0 if overstocked.
-- Uses fish.max_fish_per_liter when available, else 1-per-10L rule.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_tank_capacity (
    p_setup_id IN NUMBER
) RETURN NUMBER AS
    v_volume        NUMBER;
    v_tank_id       NUMBER;
    v_total_fish    NUMBER := 0;
    v_max_allowed   NUMBER;
BEGIN
    -- Get tank volume via setup
    SELECT asu.tank_id, t.volume_liters
    INTO   v_tank_id, v_volume
    FROM   aquarium_setups asu
    JOIN   tanks t ON asu.tank_id = t.tank_id
    WHERE  asu.setup_id = p_setup_id;

    -- Sum fish quantity in this setup
    SELECT NVL(SUM(si.quantity), 0)
    INTO   v_total_fish
    FROM   setup_items si
    JOIN   products    p  ON si.product_id = p.product_id
    WHERE  si.setup_id = p_setup_id
      AND  p.product_type = 'FISH';

    -- Max fish: use most restrictive max_fish_per_liter from fish in setup,
    -- else fall back to 1 fish per 10 litres.
    SELECT NVL(
        MIN(FLOOR(v_volume * f.max_fish_per_liter)),
        FLOOR(v_volume / 10)
    )
    INTO   v_max_allowed
    FROM   setup_items si
    JOIN   fish f ON f.product_id = si.product_id
    WHERE  si.setup_id    = p_setup_id
      AND  si.item_type   = 'FISH'
      AND  f.max_fish_per_liter IS NOT NULL;

    IF v_total_fish <= v_max_allowed THEN
        RETURN 1;
    ELSE
        RETURN 0;
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 1;   -- No fish = capacity fine
    WHEN OTHERS        THEN RETURN 0;
END validate_tank_capacity;
/

-- ============================================================
-- FUNCTION: validate_water_type
-- Returns 1 if ALL fish and plants in the setup match the
-- setup's declared water_type. Returns 0 if any mismatch.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_water_type (
    p_setup_id IN NUMBER
) RETURN NUMBER AS
    v_setup_water   VARCHAR2(20);
    v_conflicts     NUMBER := 0;
BEGIN
    SELECT water_type INTO v_setup_water
    FROM aquarium_setups WHERE setup_id = p_setup_id;

    -- Check fish water type
    SELECT COUNT(*)
    INTO   v_conflicts
    FROM   setup_items si
    JOIN   fish f ON f.product_id = si.product_id
    WHERE  si.setup_id = p_setup_id
      AND  f.water_type <> v_setup_water;

    IF v_conflicts > 0 THEN RETURN 0; END IF;

    -- Check plant water type
    SELECT COUNT(*)
    INTO   v_conflicts
    FROM   setup_items si
    JOIN   plants pl ON pl.product_id = si.product_id
    WHERE  si.setup_id = p_setup_id
      AND  pl.water_type <> v_setup_water;

    IF v_conflicts > 0 THEN RETURN 0; END IF;

    -- Check decorations
    SELECT COUNT(*)
    INTO   v_conflicts
    FROM   setup_items  si
    JOIN   decorations  d ON d.product_id = si.product_id
    WHERE  si.setup_id = p_setup_id
      AND  d.safe_water_type IS NOT NULL
      AND  d.safe_water_type <> 'BOTH'
      AND  d.safe_water_type <> v_setup_water;

    IF v_conflicts > 0 THEN RETURN 0; END IF;

    RETURN 1;

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 0;
    WHEN OTHERS        THEN RETURN 0;
END validate_water_type;
/

-- ============================================================
-- FUNCTION: validate_temperature
-- Returns 1 if all fish share an overlapping temperature range.
-- Returns 0 if ranges are mutually exclusive.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_temperature (
    p_setup_id IN NUMBER
) RETURN NUMBER AS
    v_overlap_min   NUMBER := -999;   -- highest of all minimums
    v_overlap_max   NUMBER :=  999;   -- lowest  of all maximums
BEGIN
    -- For each fish in the setup, narrow the shared window
    FOR r IN (
        SELECT f.min_temp_c, f.max_temp_c
        FROM   setup_items si
        JOIN   fish f ON f.product_id = si.product_id
        WHERE  si.setup_id = p_setup_id
    ) LOOP
        IF r.min_temp_c > v_overlap_min THEN v_overlap_min := r.min_temp_c; END IF;
        IF r.max_temp_c < v_overlap_max THEN v_overlap_max := r.max_temp_c; END IF;
    END LOOP;

    -- A valid overlap means the shared window has at least 1 degree
    IF v_overlap_min = -999 THEN RETURN 1; END IF;   -- No fish added yet
    IF v_overlap_min < v_overlap_max THEN RETURN 1; ELSE RETURN 0; END IF;

EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END validate_temperature;
/

-- ============================================================
-- FUNCTION: get_setup_total_price
-- Returns the sum of all item prices + tank price for a setup.
-- ============================================================
CREATE OR REPLACE FUNCTION get_setup_total_price (
    p_setup_id IN NUMBER
) RETURN NUMBER AS
    v_items_total   NUMBER := 0;
    v_tank_price    NUMBER := 0;
BEGIN
    -- Sum setup items
    SELECT NVL(SUM(si.quantity * p.unit_price), 0)
    INTO   v_items_total
    FROM   setup_items si
    JOIN   products    p ON si.product_id = p.product_id
    WHERE  si.setup_id = p_setup_id;

    -- Add tank price
    SELECT NVL(p.unit_price, 0)
    INTO   v_tank_price
    FROM   aquarium_setups asu
    JOIN   tanks     t  ON asu.tank_id   = t.tank_id
    JOIN   products  p  ON t.product_id  = p.product_id
    WHERE  asu.setup_id = p_setup_id;

    RETURN ROUND(v_items_total + v_tank_price, 2);

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 0;
    WHEN OTHERS        THEN RETURN 0;
END get_setup_total_price;
/

-- ============================================================
-- FUNCTION: check_availability
-- Returns 1 if enough available (on_hand - reserved) stock exists.
-- Returns 0 if insufficient or product has no inventory record.
-- ============================================================
CREATE OR REPLACE FUNCTION check_availability (
    p_product_id    IN NUMBER,
    p_quantity      IN NUMBER
) RETURN NUMBER AS
    v_available NUMBER;
BEGIN
    SELECT (qty_on_hand - qty_reserved)
    INTO   v_available
    FROM   inventory
    WHERE  product_id = p_product_id;

    IF v_available >= p_quantity THEN RETURN 1; ELSE RETURN 0; END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 0;
    WHEN OTHERS        THEN RETURN 0;
END check_availability;
/

-- ============================================================
-- FUNCTION: calc_order_profit
-- Returns gross profit for a given order_id.
-- Profit = revenue - cost of goods sold
-- ============================================================
CREATE OR REPLACE FUNCTION calc_order_profit (
    p_order_id IN NUMBER
) RETURN NUMBER AS
    v_revenue   NUMBER := 0;
    v_cogs      NUMBER := 0;
BEGIN
    SELECT NVL(SUM(oi.quantity * p.unit_price), 0),
           NVL(SUM(oi.quantity * NVL(p.cost_price, 0)), 0)
    INTO   v_revenue, v_cogs
    FROM   order_items oi
    JOIN   products    p  ON oi.product_id = p.product_id
    WHERE  oi.order_id = p_order_id;

    RETURN ROUND(v_revenue - v_cogs, 2);

EXCEPTION
    WHEN OTHERS THEN RETURN 0;
END calc_order_profit;
/

-- ============================================================
-- FUNCTION: get_product_stock
-- Simple utility — returns current qty_on_hand for a product.
-- ============================================================
CREATE OR REPLACE FUNCTION get_product_stock (
    p_product_id IN NUMBER
) RETURN NUMBER AS
    v_qty NUMBER;
BEGIN
    SELECT qty_on_hand INTO v_qty FROM inventory WHERE product_id = p_product_id;
    RETURN v_qty;
EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN -1;
END get_product_stock;
/

PROMPT Module 7 — All PL/SQL functions created.
