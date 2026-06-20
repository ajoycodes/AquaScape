-- ============================================================
-- MODULE 6c: ORDER PROCEDURES
-- place_order / cancel_order / update_order_status
-- ============================================================

-- ============================================================
-- PROCEDURE: place_order
-- Converts a customer cart into a confirmed order.
-- Validates stock, resolves discounts, creates order + items,
-- deducts inventory, clears cart. Full ACID transaction.
-- ============================================================
CREATE OR REPLACE PROCEDURE place_order (
    p_customer_id   IN  NUMBER,
    p_setup_id      IN  NUMBER   DEFAULT NULL,
    p_discount_code IN  VARCHAR2 DEFAULT NULL,
    p_shipping_addr IN  VARCHAR2,
    p_order_id      OUT NUMBER
) AS
    v_cart_id       NUMBER;
    v_subtotal      NUMBER := 0;
    v_disc_id       NUMBER := NULL;
    v_disc_type     VARCHAR2(10);
    v_disc_raw_val  NUMBER := 0;
    v_disc_applied  NUMBER := 0;
    v_tax_rate      CONSTANT NUMBER := 0.06;
    v_tax_amt       NUMBER;
    v_total         NUMBER;
    v_avail         NUMBER;

    CURSOR c_cart IS
        SELECT ci.product_id, ci.quantity, p.unit_price,
               (ci.quantity * p.unit_price) AS line_total
        FROM   cart_items ci
        JOIN   cart      c  ON ci.cart_id    = c.cart_id
        JOIN   products  p  ON ci.product_id = p.product_id
        WHERE  c.customer_id = p_customer_id;
BEGIN
    -- 1. Get cart
    BEGIN
        SELECT cart_id INTO v_cart_id
        FROM cart WHERE customer_id = p_customer_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20050, 'No cart found for customer: ' || p_customer_id);
    END;

    -- 2. Validate cart is not empty
    DECLARE v_cnt NUMBER; BEGIN
        SELECT COUNT(*) INTO v_cnt FROM cart_items WHERE cart_id = v_cart_id;
        IF v_cnt = 0 THEN
            RAISE_APPLICATION_ERROR(-20051, 'Cart is empty. Add items before placing order.');
        END IF;
    END;

    -- 3. Validate stock and calculate subtotal
    FOR r IN c_cart LOOP
        v_avail := check_availability(r.product_id, r.quantity);
        IF v_avail = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20052,
                'Insufficient stock for product ID ' || r.product_id ||
                ' (requested: ' || r.quantity || ')'
            );
        END IF;
        v_subtotal := v_subtotal + r.line_total;
    END LOOP;

    -- 4. Resolve discount code
    IF p_discount_code IS NOT NULL THEN
        BEGIN
            SELECT discount_id, discount_type, value
            INTO   v_disc_id, v_disc_type, v_disc_raw_val
            FROM   discounts
            WHERE  code      = p_discount_code
              AND  is_active = 1
              AND  (valid_from  IS NULL OR valid_from  <= SYSDATE)
              AND  (valid_until IS NULL OR valid_until >= SYSDATE)
              AND  (max_uses    IS NULL OR used_count < max_uses)
              AND  min_order_amt <= v_subtotal;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20053,
                    'Discount code "' || p_discount_code || '" is invalid, expired, or minimum order not met.');
        END;

        IF v_disc_type = 'PERCENT' THEN
            v_disc_applied := ROUND(v_subtotal * (v_disc_raw_val / 100), 2);
        ELSE
            v_disc_applied := LEAST(v_disc_raw_val, v_subtotal);
        END IF;
    END IF;

    -- 5. Calculate tax and total
    v_tax_amt := ROUND((v_subtotal - v_disc_applied) * v_tax_rate, 2);
    v_total   := v_subtotal - v_disc_applied + v_tax_amt;

    -- 6. Create order header
    INSERT INTO orders (
        customer_id, setup_id, subtotal, discount_total,
        tax_amount,  total_amount, shipping_addr, order_status
    ) VALUES (
        p_customer_id, p_setup_id, v_subtotal, v_disc_applied,
        v_tax_amt, v_total, p_shipping_addr, 'CONFIRMED'
    ) RETURNING order_id INTO p_order_id;

    -- 7. Insert order line items
    FOR r IN c_cart LOOP
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
        VALUES (p_order_id, r.product_id, r.quantity, r.unit_price, r.line_total);
        -- Note: stock deduction is handled by trigger trg_deduct_stock
    END LOOP;

    -- 8. Apply discount record
    IF v_disc_id IS NOT NULL THEN
        INSERT INTO order_discounts (order_id, discount_id, applied_amt)
        VALUES (p_order_id, v_disc_id, v_disc_applied);

        UPDATE discounts SET used_count = used_count + 1 WHERE discount_id = v_disc_id;
    END IF;

    -- 9. Clear cart
    DELETE FROM cart_items WHERE cart_id = v_cart_id;
    UPDATE cart SET updated_at = SYSDATE WHERE cart_id = v_cart_id;

    -- 10. If came from builder, mark setup as ORDERED
    IF p_setup_id IS NOT NULL THEN
        UPDATE aquarium_setups
        SET status = 'ORDERED', updated_at = SYSDATE
        WHERE setup_id = p_setup_id;
    END IF;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Order placed: ID=' || p_order_id ||
                         ' | Total=RM' || v_total ||
                         ' | Items deducted from inventory via trigger.');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END place_order;
/

-- ============================================================
-- PROCEDURE: cancel_order
-- Cancels an order and restores inventory.
-- Cannot cancel SHIPPED or DELIVERED orders.
-- ============================================================
CREATE OR REPLACE PROCEDURE cancel_order (
    p_order_id  IN NUMBER,
    p_user_id   IN NUMBER,
    p_reason    IN VARCHAR2 DEFAULT NULL
) AS
    v_status    VARCHAR2(20);
BEGIN
    -- Get and lock order
    SELECT order_status INTO v_status
    FROM orders WHERE order_id = p_order_id FOR UPDATE;

    IF v_status IN ('SHIPPED','DELIVERED','CANCELLED','REFUNDED') THEN
        RAISE_APPLICATION_ERROR(
            -20060,
            'Cannot cancel order in status: ' || v_status
        );
    END IF;

    -- Update order status
    UPDATE orders
    SET order_status = 'CANCELLED',
        notes        = NVL2(p_reason, NVL(notes,'') || ' | CANCELLED: ' || p_reason, notes)
    WHERE order_id = p_order_id;

    -- Restore inventory for each item
    FOR r IN (SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id) LOOP
        update_inventory(
            p_product_id => r.product_id,
            p_delta      => r.quantity,       -- positive = restore
            p_move_type  => 'RETURN',
            p_ref_id     => p_order_id,
            p_ref_type   => 'ORDER',
            p_user_id    => p_user_id,
            p_notes      => 'Order cancellation restore'
        );
    END LOOP;

    -- Log to audit
    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES ('ORDERS', 'UPDATE', p_order_id, 'status=CANCELLED | reason=' || p_reason);

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Order ' || p_order_id || ' cancelled. Inventory restored.');

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20061, 'Order ID ' || p_order_id || ' not found.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END cancel_order;
/

-- ============================================================
-- PROCEDURE: update_order_status
-- Moves order through its state machine.
-- ============================================================
CREATE OR REPLACE PROCEDURE update_order_status (
    p_order_id      IN NUMBER,
    p_new_status    IN VARCHAR2,
    p_user_id       IN NUMBER
) AS
    v_old_status    VARCHAR2(20);
    v_allowed       NUMBER := 0;
BEGIN
    SELECT order_status INTO v_old_status
    FROM orders WHERE order_id = p_order_id FOR UPDATE;

    -- Define allowed transitions
    IF (v_old_status = 'PENDING'     AND p_new_status = 'CONFIRMED')   THEN v_allowed := 1; END IF;
    IF (v_old_status = 'CONFIRMED'   AND p_new_status = 'PROCESSING')  THEN v_allowed := 1; END IF;
    IF (v_old_status = 'PROCESSING'  AND p_new_status = 'SHIPPED')     THEN v_allowed := 1; END IF;
    IF (v_old_status = 'SHIPPED'     AND p_new_status = 'DELIVERED')   THEN v_allowed := 1; END IF;

    IF v_allowed = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20070,
            'Invalid status transition: ' || v_old_status || ' → ' || p_new_status
        );
    END IF;

    UPDATE orders SET order_status = p_new_status WHERE order_id = p_order_id;

    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
    VALUES ('ORDERS', 'UPDATE', p_order_id,
            'status=' || v_old_status,
            'status=' || p_new_status);

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Order ' || p_order_id || ': ' || v_old_status || ' → ' || p_new_status);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20071, 'Order ID ' || p_order_id || ' not found.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END update_order_status;
/

PROMPT Order procedures created.
