-- ============================================================
-- MODULE 8a: INVENTORY TRIGGERS
-- trg_deduct_stock         — auto-deduct after order item insert
-- trg_no_negative_stock    — prevent negative qty
-- trg_low_stock_alert      — auto-generate alert at reorder level
-- ============================================================

-- ============================================================
-- TRIGGER: trg_deduct_stock
-- Fires AFTER each row inserted into ORDER_ITEMS.
-- Deducts qty_on_hand and logs the movement.
-- NOTE: The update_inventory procedure also does this, but the
-- trigger acts as the DB-level safety net even if called from
-- raw SQL or a future integration.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
DECLARE
    v_new_qty   NUMBER;
    v_current   NUMBER;
BEGIN
    -- Get current stock (read only — no FOR UPDATE inside row trigger)
    SELECT qty_on_hand INTO v_current
    FROM   inventory
    WHERE  product_id = :NEW.product_id;

    v_new_qty := v_current - :NEW.quantity;

    -- Guard check (trg_no_negative_stock will enforce, but fail loudly here too)
    IF v_new_qty < 0 THEN
        RAISE_APPLICATION_ERROR(
            -20100,
            'Trigger: insufficient stock for product ' || :NEW.product_id ||
            '. Available: ' || v_current || ', Ordered: ' || :NEW.quantity
        );
    END IF;

    -- Deduct stock
    UPDATE inventory
    SET    qty_on_hand  = v_new_qty,
           last_updated = SYSDATE
    WHERE  product_id   = :NEW.product_id;

    -- Write movement ledger
    INSERT INTO inventory_movements (
        product_id, movement_type, quantity_delta,
        qty_after,  reference_id, reference_type
    ) VALUES (
        :NEW.product_id, 'SALE', -:NEW.quantity,
        v_new_qty, :NEW.order_id, 'ORDER'
    );

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20101,
            'No inventory record for product ' || :NEW.product_id);
END trg_deduct_stock;
/

-- ============================================================
-- TRIGGER: trg_no_negative_stock
-- Fires BEFORE UPDATE on INVENTORY.
-- Acts as the absolute last-resort guard against negative stock.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_no_negative_stock
BEFORE UPDATE OF qty_on_hand ON inventory
FOR EACH ROW
BEGIN
    IF :NEW.qty_on_hand < 0 THEN
        RAISE_APPLICATION_ERROR(
            -20102,
            'BLOCKED: qty_on_hand cannot be negative. ' ||
            'Product ID: ' || :NEW.product_id ||
            ' | Attempted value: ' || :NEW.qty_on_hand
        );
    END IF;

    IF :NEW.qty_reserved < 0 THEN
        RAISE_APPLICATION_ERROR(
            -20103,
            'BLOCKED: qty_reserved cannot be negative. ' ||
            'Product ID: ' || :NEW.product_id
        );
    END IF;
END trg_no_negative_stock;
/

-- ============================================================
-- TRIGGER: trg_low_stock_alert
-- Fires AFTER UPDATE on INVENTORY qty_on_hand column.
-- Inserts a new LOW_STOCK_ALERTS record if stock falls to
-- or below reorder_level and no open alert already exists.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_low_stock_alert
AFTER UPDATE OF qty_on_hand ON inventory
FOR EACH ROW
DECLARE
    v_open_alert_count  NUMBER;
BEGIN
    -- Only act when stock drops to or below reorder level
    IF :NEW.qty_on_hand <= :NEW.reorder_level THEN

        -- Avoid duplicate open alerts for the same product
        SELECT COUNT(*)
        INTO   v_open_alert_count
        FROM   low_stock_alerts
        WHERE  product_id  = :NEW.product_id
          AND  is_resolved = 0;

        IF v_open_alert_count = 0 THEN
            INSERT INTO low_stock_alerts (
                product_id, qty_at_alert, reorder_level
            ) VALUES (
                :NEW.product_id, :NEW.qty_on_hand, :NEW.reorder_level
            );
        END IF;
    END IF;
END trg_low_stock_alert;
/

-- ============================================================
-- TRIGGER: trg_restore_stock_on_cancel
-- Fires AFTER UPDATE on ORDERS when status changes to CANCELLED.
-- Restores inventory for each line item in the cancelled order.
-- Uses an AFTER statement-level trigger pattern with a
-- compound trigger to avoid mutating table errors.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_auto_timestamp_inventory
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
    :NEW.last_updated := SYSDATE;
END trg_auto_timestamp_inventory;
/

PROMPT Inventory triggers created.
