
CREATE OR REPLACE PROCEDURE update_inventory (
    p_product_id    IN  NUMBER,
    p_delta         IN  NUMBER,
    p_move_type     IN  VARCHAR2,
    p_ref_id        IN  NUMBER   DEFAULT NULL,
    p_ref_type      IN  VARCHAR2 DEFAULT NULL,
    p_user_id       IN  NUMBER   DEFAULT NULL,
    p_notes         IN  VARCHAR2 DEFAULT NULL
) AS
    v_current_qty   NUMBER;
    v_new_qty       NUMBER;
    v_reorder_lvl   NUMBER;
BEGIN

    SELECT qty_on_hand, reorder_level
    INTO   v_current_qty, v_reorder_lvl
    FROM   inventory
    WHERE  product_id = p_product_id
    FOR UPDATE;

    v_new_qty := v_current_qty + p_delta;


    IF v_new_qty < 0 THEN
        RAISE_APPLICATION_ERROR(
            -20040,
            'Stock cannot go negative. Product ID: ' || p_product_id ||
            ' | Current: ' || v_current_qty || ' | Delta: ' || p_delta
        );
    END IF;


    UPDATE inventory
    SET    qty_on_hand  = v_new_qty,
           last_updated = SYSDATE
    WHERE  product_id   = p_product_id;


    INSERT INTO inventory_movements (
        product_id, movement_type, quantity_delta, qty_after,
        reference_id, reference_type, performed_by, notes
    ) VALUES (
        p_product_id, p_move_type, p_delta, v_new_qty,
        p_ref_id, p_ref_type, p_user_id, p_notes
    );


    COMMIT;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20041, 'No inventory record for product ID: ' || p_product_id);
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END update_inventory;
/


CREATE OR REPLACE PROCEDURE add_product_to_inventory (
    p_product_id    IN NUMBER,
    p_initial_qty   IN NUMBER   DEFAULT 0,
    p_reorder_level IN NUMBER   DEFAULT 10,
    p_reorder_qty   IN NUMBER   DEFAULT 50
) AS
    v_exists NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_exists
    FROM inventory WHERE product_id = p_product_id;

    IF v_exists > 0 THEN
        RAISE_APPLICATION_ERROR(-20042, 'Inventory record already exists for product: ' || p_product_id);
    END IF;

    INSERT INTO inventory (product_id, qty_on_hand, qty_reserved, reorder_level, reorder_qty)
    VALUES (p_product_id, p_initial_qty, 0, p_reorder_level, p_reorder_qty);

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END add_product_to_inventory;
/

PROMPT Inventory procedures created.
