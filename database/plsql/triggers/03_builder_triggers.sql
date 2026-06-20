-- ============================================================
-- MODULE 8c: AQUARIUM BUILDER TRIGGERS
-- trg_compat_check         — block incompatible items at DB level
-- trg_validate_water_item  — block wrong water-type items
-- trg_cart_updated_at      — auto timestamp cart
-- trg_discount_used_count  — validate max_uses not exceeded
-- ============================================================

-- ============================================================
-- TRIGGER: trg_compat_check
-- Fires BEFORE INSERT on SETUP_ITEMS.
-- Calls check_compatibility() — if conflicts > 0, RAISES error.
-- This is the DB-level enforcement of the compatibility engine.
-- Even if the application layer is bypassed, this trigger fires.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_compat_check
BEFORE INSERT ON setup_items
FOR EACH ROW
DECLARE
    v_conflicts NUMBER;
    v_warnings  NUMBER;
BEGIN
    v_conflicts := check_compatibility(:NEW.setup_id, :NEW.product_id);

    IF v_conflicts > 0 THEN
        RAISE_APPLICATION_ERROR(
            -20200,
            'DB TRIGGER BLOCKED: Product ' || :NEW.product_id ||
            ' has ' || v_conflicts || ' ERROR-level compatibility conflict(s) ' ||
            'with existing items in setup ' || :NEW.setup_id ||
            '. Check COMPATIBILITY_RULES table.'
        );
    END IF;

    -- Warnings do not block but are noted in DBMS_OUTPUT for dev visibility
    v_warnings := get_compatibility_warnings(:NEW.setup_id, :NEW.product_id);
    IF v_warnings > 0 THEN
        DBMS_OUTPUT.PUT_LINE(
            'WARNING: Product ' || :NEW.product_id ||
            ' has ' || v_warnings || ' WARNING-level compatibility note(s).'
        );
    END IF;
END trg_compat_check;
/

-- ============================================================
-- TRIGGER: trg_validate_water_item
-- Fires BEFORE INSERT on SETUP_ITEMS.
-- Rejects any fish or plant whose water_type does not match
-- the setup's declared water_type.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_validate_water_item
BEFORE INSERT ON setup_items
FOR EACH ROW
DECLARE
    v_setup_water   VARCHAR2(20);
    v_item_water    VARCHAR2(20);
    v_has_water     NUMBER := 0;
BEGIN
    -- Get setup water type
    SELECT water_type INTO v_setup_water
    FROM aquarium_setups WHERE setup_id = :NEW.setup_id;

    -- Check FISH
    IF :NEW.item_type = 'FISH' THEN
        BEGIN
            SELECT water_type INTO v_item_water
            FROM fish WHERE product_id = :NEW.product_id;
            v_has_water := 1;
        EXCEPTION WHEN NO_DATA_FOUND THEN NULL;
        END;
    END IF;

    -- Check PLANT
    IF :NEW.item_type = 'PLANT' THEN
        BEGIN
            SELECT water_type INTO v_item_water
            FROM plants WHERE product_id = :NEW.product_id;
            v_has_water := 1;
        EXCEPTION WHEN NO_DATA_FOUND THEN NULL;
        END;
    END IF;

    -- Block if mismatch
    IF v_has_water = 1 AND v_item_water <> v_setup_water THEN
        RAISE_APPLICATION_ERROR(
            -20201,
            'DB TRIGGER BLOCKED: Product ' || :NEW.product_id ||
            ' requires ' || v_item_water ||
            ' water but setup ' || :NEW.setup_id ||
            ' is configured for ' || v_setup_water || '.'
        );
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20202, 'Setup or product not found in water type validation.');
END trg_validate_water_item;
/

-- ============================================================
-- TRIGGER: trg_cart_updated_at
-- Fires BEFORE UPDATE on CART — keeps updated_at fresh.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_cart_updated_at
BEFORE UPDATE ON cart
FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSDATE;
END trg_cart_updated_at;
/

-- ============================================================
-- TRIGGER: trg_validate_cart_stock
-- Fires BEFORE INSERT on CART_ITEMS.
-- Prevents adding an out-of-stock product to cart.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_validate_cart_stock
BEFORE INSERT ON cart_items
FOR EACH ROW
DECLARE
    v_available NUMBER;
BEGIN
    v_available := check_availability(:NEW.product_id, :NEW.quantity);

    IF v_available = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20203,
            'Product ' || :NEW.product_id ||
            ' is out of stock or insufficient quantity. Cannot add to cart.'
        );
    END IF;
END trg_validate_cart_stock;
/

-- ============================================================
-- TRIGGER: trg_discount_max_uses
-- Fires BEFORE INSERT on ORDER_DISCOUNTS.
-- Double-checks that discount has not exceeded max_uses.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_discount_max_uses
BEFORE INSERT ON order_discounts
FOR EACH ROW
DECLARE
    v_max_uses  NUMBER;
    v_used      NUMBER;
BEGIN
    SELECT max_uses, used_count
    INTO   v_max_uses, v_used
    FROM   discounts
    WHERE  discount_id = :NEW.discount_id;

    IF v_max_uses IS NOT NULL AND v_used >= v_max_uses THEN
        RAISE_APPLICATION_ERROR(
            -20204,
            'Discount ' || :NEW.discount_id || ' has reached its maximum usage limit.'
        );
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20205, 'Discount ID ' || :NEW.discount_id || ' not found.');
END trg_discount_max_uses;
/

-- ============================================================
-- TRIGGER: trg_po_total_on_item_change
-- Fires AFTER INSERT, UPDATE, DELETE on SUPPLIER_PO_ITEMS.
-- Keeps supplier_po.total_amount in sync automatically.
-- ============================================================
CREATE OR REPLACE TRIGGER trg_po_total_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON supplier_po_items
FOR EACH ROW
DECLARE
    v_po_id     NUMBER;
    v_new_total NUMBER;
BEGIN
    v_po_id := NVL(:NEW.po_id, :OLD.po_id);

    SELECT NVL(SUM(line_total), 0)
    INTO   v_new_total
    FROM   supplier_po_items
    WHERE  po_id = v_po_id;

    UPDATE supplier_po
    SET    total_amount = v_new_total
    WHERE  po_id = v_po_id;

EXCEPTION
    WHEN OTHERS THEN NULL;
END trg_po_total_on_item_change;
/

PROMPT Builder and cart triggers created.
