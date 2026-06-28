-- ============================================================
-- MODULE 8b: ORDER TRIGGERS
-- trg_update_order_total   — auto-recalculate totals
-- trg_audit_orders         — DML audit log
-- trg_order_timestamp      — auto updated_at (products table)
-- ============================================================

-- ============================================================
-- TRIGGER: trg_update_order_total
-- Fires FOR INSERT, UPDATE, DELETE on ORDER_ITEMS.
-- Uses a COMPOUND TRIGGER to avoid ORA-04091 mutating table:
--   AFTER EACH ROW  — collects affected order IDs into a collection
--   AFTER STATEMENT — performs the SUM once per order after all
--                     row inserts complete (table no longer mutating)
-- ============================================================
CREATE OR REPLACE TRIGGER trg_update_order_total
FOR INSERT OR UPDATE OR DELETE ON order_items
COMPOUND TRIGGER

    -- Shared state: accumulate every affected order_id per statement
    TYPE t_order_tab IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    g_orders    t_order_tab;
    g_idx       PLS_INTEGER := 0;

AFTER EACH ROW IS
BEGIN
    g_idx := g_idx + 1;
    g_orders(g_idx) := NVL(:NEW.order_id, :OLD.order_id);
END AFTER EACH ROW;

AFTER STATEMENT IS
    v_new_subtotal  NUMBER;
    v_discount      NUMBER;
    v_tax           NUMBER;
    -- Track already-processed order IDs to avoid duplicate UPDATEs
    TYPE t_seen IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    v_seen  t_seen;
BEGIN
    FOR i IN 1 .. g_idx LOOP
        DECLARE
            v_oid NUMBER := g_orders(i);
        BEGIN
            IF NOT v_seen.EXISTS(v_oid) THEN
                v_seen(v_oid) := 1;

                SELECT NVL(SUM(line_total), 0)
                INTO   v_new_subtotal
                FROM   order_items
                WHERE  order_id = v_oid;

                SELECT NVL(discount_total, 0), NVL(tax_amount, 0)
                INTO   v_discount, v_tax
                FROM   orders
                WHERE  order_id = v_oid;

                UPDATE orders
                SET    subtotal     = v_new_subtotal,
                       total_amount = v_new_subtotal - v_discount + v_tax
                WHERE  order_id = v_oid;
            END IF;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN NULL;
        END;
    END LOOP;
END AFTER STATEMENT;

END trg_update_order_total;
/

-- ============================================================
-- TRIGGER: trg_audit_orders
-- Fires AFTER INSERT, UPDATE, DELETE on ORDERS.
-- Records the old and new status + total to audit_log.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
DECLARE
    v_op        VARCHAR2(10);
    v_old_vals  VARCHAR2(4000);
    v_new_vals  VARCHAR2(4000);
    v_rec_id    NUMBER;
BEGIN
    IF INSERTING THEN
        v_op     := 'INSERT';
        v_rec_id := :NEW.order_id;
        v_new_vals := 'customer=' || :NEW.customer_id ||
                      '|status='  || :NEW.order_status ||
                      '|total='   || :NEW.total_amount;

    ELSIF UPDATING THEN
        v_op     := 'UPDATE';
        v_rec_id := :NEW.order_id;
        v_old_vals := 'status='  || :OLD.order_status ||
                      '|total='  || :OLD.total_amount;
        v_new_vals := 'status='  || :NEW.order_status ||
                      '|total='  || :NEW.total_amount;

    ELSIF DELETING THEN
        v_op     := 'DELETE';
        v_rec_id := :OLD.order_id;
        v_old_vals := 'status='  || :OLD.order_status ||
                      '|total='  || :OLD.total_amount;
    END IF;

    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
    VALUES ('ORDERS', v_op, v_rec_id, v_old_vals, v_new_vals);

EXCEPTION
    WHEN OTHERS THEN NULL;  -- Audit must never block the main transaction
END trg_audit_orders;
/

-- ============================================================
-- TRIGGER: trg_audit_products
-- Fires AFTER INSERT, UPDATE, DELETE on PRODUCTS.
-- Captures price changes and activation toggling.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW
DECLARE
    v_op        VARCHAR2(10);
    v_old_vals  VARCHAR2(4000);
    v_new_vals  VARCHAR2(4000);
    v_rec_id    NUMBER;
BEGIN
    IF INSERTING THEN
        v_op     := 'INSERT';
        v_rec_id := :NEW.product_id;
        v_new_vals := 'name='       || :NEW.product_name  ||
                      '|price='     || :NEW.unit_price     ||
                      '|active='    || :NEW.is_active;

    ELSIF UPDATING THEN
        v_op     := 'UPDATE';
        v_rec_id := :NEW.product_id;
        v_old_vals := 'price='   || :OLD.unit_price  ||
                      '|active=' || :OLD.is_active;
        v_new_vals := 'price='   || :NEW.unit_price  ||
                      '|active=' || :NEW.is_active;

    ELSIF DELETING THEN
        v_op     := 'DELETE';
        v_rec_id := :OLD.product_id;
        v_old_vals := 'name=' || :OLD.product_name;
    END IF;

    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
    VALUES ('PRODUCTS', v_op, v_rec_id, v_old_vals, v_new_vals);

EXCEPTION
    WHEN OTHERS THEN NULL;
END trg_audit_products;
/

-- ============================================================
-- TRIGGER: trg_audit_inventory
-- Fires AFTER UPDATE on INVENTORY.
-- Records qty changes for full stock audit trail.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_audit_inventory
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF :OLD.qty_on_hand <> :NEW.qty_on_hand THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
        VALUES (
            'INVENTORY', 'UPDATE', :NEW.product_id,
            'qty=' || :OLD.qty_on_hand,
            'qty=' || :NEW.qty_on_hand || '|delta=' || (:NEW.qty_on_hand - :OLD.qty_on_hand)
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END trg_audit_inventory;
/

-- ============================================================
-- TRIGGER: trg_product_updated_at
-- Fires BEFORE UPDATE on PRODUCTS — keeps updated_at current.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_product_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSDATE;
END trg_product_updated_at;
/

-- ============================================================
-- TRIGGER: trg_setup_updated_at
-- Fires BEFORE UPDATE on AQUARIUM_SETUPS.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_setup_updated_at
BEFORE UPDATE ON aquarium_setups
FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSDATE;
END trg_setup_updated_at;
/

PROMPT Order and audit triggers created.
