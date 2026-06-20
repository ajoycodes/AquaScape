-- ============================================================
-- MODULE 6b: AQUARIUM BUILDER PROCEDURES
-- create_aquarium_setup / add_item_to_setup / save_setup
-- ============================================================

-- ============================================================
-- PROCEDURE: create_aquarium_setup
-- Creates a new aquarium design for a customer.
-- Validates that the tank exists before proceeding.
-- ============================================================
CREATE OR REPLACE PROCEDURE create_aquarium_setup (
    p_customer_id   IN  NUMBER,
    p_tank_id       IN  NUMBER,
    p_setup_name    IN  VARCHAR2,
    p_water_type    IN  VARCHAR2,
    p_target_temp   IN  NUMBER   DEFAULT NULL,
    p_target_ph     IN  NUMBER   DEFAULT NULL,
    p_description   IN  VARCHAR2 DEFAULT NULL,
    p_setup_id      OUT NUMBER
) AS
    v_tank_volume   NUMBER;
    v_tank_water    VARCHAR2(20);
BEGIN
    -- Validate tank exists and pull specs
    BEGIN
        SELECT t.volume_liters
        INTO   v_tank_volume
        FROM   tanks    t
        JOIN   products p ON t.product_id = p.product_id
        WHERE  t.tank_id  = p_tank_id
          AND  p.is_active = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20001, 'Tank ID ' || p_tank_id || ' not found or inactive.');
    END;

    -- Validate customer exists
    DECLARE
        v_cust_count NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_cust_count FROM customers WHERE customer_id = p_customer_id AND is_active = 1;
        IF v_cust_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Customer ID ' || p_customer_id || ' not found or inactive.');
        END IF;
    END;

    -- Create the setup
    INSERT INTO aquarium_setups (
        customer_id, tank_id, setup_name,
        water_type,  target_temp_c, target_ph, description
    ) VALUES (
        p_customer_id, p_tank_id, p_setup_name,
        p_water_type,  p_target_temp, p_target_ph, p_description
    ) RETURNING setup_id INTO p_setup_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Setup created: ID=' || p_setup_id || ' | ' || p_setup_name);

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END create_aquarium_setup;
/

-- ============================================================
-- PROCEDURE: add_item_to_setup
-- Adds a product to an aquarium setup.
-- Calls check_compatibility function before insert.
-- Trigger trg_compat_check provides DB-level enforcement.
-- ============================================================
CREATE OR REPLACE PROCEDURE add_item_to_setup (
    p_setup_id      IN NUMBER,
    p_product_id    IN NUMBER,
    p_item_type     IN VARCHAR2,
    p_quantity      IN NUMBER   DEFAULT 1,
    p_notes         IN VARCHAR2 DEFAULT NULL
) AS
    v_setup_status  VARCHAR2(20);
    v_conflicts     NUMBER;
    v_prod_type     VARCHAR2(20);
    v_capacity_ok   NUMBER;
BEGIN
    -- Check setup is still editable
    SELECT status INTO v_setup_status
    FROM aquarium_setups WHERE setup_id = p_setup_id;

    IF v_setup_status NOT IN ('DRAFT') THEN
        RAISE_APPLICATION_ERROR(-20010,
            'Setup ' || p_setup_id || ' is ' || v_setup_status || ' — cannot add items.');
    END IF;

    -- Verify product type matches declared item_type
    SELECT product_type INTO v_prod_type
    FROM products WHERE product_id = p_product_id AND is_active = 1;

    IF v_prod_type <> p_item_type THEN
        RAISE_APPLICATION_ERROR(-20011,
            'Product type mismatch: product is ' || v_prod_type || ' but item_type declared as ' || p_item_type);
    END IF;

    -- Check compatibility (errors will also be caught by trigger)
    v_conflicts := check_compatibility(p_setup_id, p_product_id);
    IF v_conflicts > 0 THEN
        RAISE_APPLICATION_ERROR(-20012,
            'Cannot add product ' || p_product_id || ': ' || v_conflicts || ' compatibility conflict(s) exist.');
    END IF;

    -- Upsert: increase quantity if already in setup
    MERGE INTO setup_items si
    USING DUAL
    ON    (si.setup_id = p_setup_id AND si.product_id = p_product_id)
    WHEN MATCHED THEN
        UPDATE SET si.quantity = si.quantity + p_quantity,
                   si.notes    = NVL(p_notes, si.notes)
    WHEN NOT MATCHED THEN
        INSERT (setup_id, product_id, item_type, quantity, notes)
        VALUES (p_setup_id, p_product_id, p_item_type, p_quantity, p_notes);

    -- Update setup timestamp
    UPDATE aquarium_setups SET updated_at = SYSDATE WHERE setup_id = p_setup_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Item added: product_id=' || p_product_id || ' x' || p_quantity || ' → setup ' || p_setup_id);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20013, 'Product ID ' || p_product_id || ' not found or inactive.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END add_item_to_setup;
/

-- ============================================================
-- PROCEDURE: save_setup
-- Validates and marks a setup as SAVED.
-- Runs all validation functions; fails if any check fails.
-- ============================================================
CREATE OR REPLACE PROCEDURE save_setup (
    p_setup_id      IN  NUMBER,
    p_customer_id   IN  NUMBER,
    p_share_code    IN  VARCHAR2 DEFAULT NULL,
    p_is_public     IN  NUMBER   DEFAULT 0,
    p_saved_id      OUT NUMBER
) AS
    v_cap_ok        NUMBER;
    v_water_ok      NUMBER;
    v_temp_ok       NUMBER;
    v_item_count    NUMBER;
BEGIN
    -- Must have at least one item
    SELECT COUNT(*) INTO v_item_count FROM setup_items WHERE setup_id = p_setup_id;
    IF v_item_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20020, 'Cannot save empty setup — add at least one item first.');
    END IF;

    -- Run all validation functions
    v_cap_ok   := validate_tank_capacity(p_setup_id);
    v_water_ok := validate_water_type(p_setup_id);
    v_temp_ok  := validate_temperature(p_setup_id);

    IF v_cap_ok = 0 THEN
        RAISE_APPLICATION_ERROR(-20021, 'Setup fails tank capacity check — too many fish for tank volume.');
    END IF;

    IF v_water_ok = 0 THEN
        RAISE_APPLICATION_ERROR(-20022, 'Setup fails water type check — mixed freshwater/saltwater items.');
    END IF;

    IF v_temp_ok = 0 THEN
        RAISE_APPLICATION_ERROR(-20023, 'Setup fails temperature check — fish have incompatible temp ranges.');
    END IF;

    -- Mark setup as SAVED
    UPDATE aquarium_setups
    SET    status     = 'SAVED',
           updated_at = SYSDATE
    WHERE  setup_id   = p_setup_id;

    -- Insert into saved_setups
    INSERT INTO saved_setups (setup_id, customer_id, share_code, is_public)
    VALUES (p_setup_id, p_customer_id, p_share_code, p_is_public)
    RETURNING saved_id INTO p_saved_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Setup ' || p_setup_id || ' saved successfully. saved_id=' || p_saved_id);

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END save_setup;
/

PROMPT Builder procedures created.
