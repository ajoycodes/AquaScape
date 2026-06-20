-- ============================================================
-- MODULE 6d: SUPPLIER & RETURN PROCEDURES
-- create_supplier_po / approve_supplier_po / receive_supplier_po
-- process_return
-- ============================================================

-- ============================================================
-- PROCEDURE: create_supplier_po
-- Creates a draft purchase order to a supplier.
-- Items are added separately via add_po_item.
-- ============================================================
CREATE OR REPLACE PROCEDURE create_supplier_po (
    p_supplier_id   IN  NUMBER,
    p_user_id       IN  NUMBER,
    p_expected_date IN  DATE     DEFAULT NULL,
    p_notes         IN  VARCHAR2 DEFAULT NULL,
    p_po_id         OUT NUMBER
) AS
    v_sup_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_sup_count
    FROM suppliers WHERE supplier_id = p_supplier_id AND is_active = 1;

    IF v_sup_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20080, 'Supplier ID ' || p_supplier_id || ' not found or inactive.');
    END IF;

    INSERT INTO supplier_po (supplier_id, created_by, expected_date, po_status, notes)
    VALUES (p_supplier_id, p_user_id, p_expected_date, 'DRAFT', p_notes)
    RETURNING po_id INTO p_po_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Supplier PO created: ID=' || p_po_id);

EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END create_supplier_po;
/

-- ============================================================
-- PROCEDURE: add_po_item
-- Adds a product line item to a DRAFT purchase order.
-- ============================================================
CREATE OR REPLACE PROCEDURE add_po_item (
    p_po_id         IN NUMBER,
    p_product_id    IN NUMBER,
    p_quantity      IN NUMBER,
    p_unit_cost     IN NUMBER
) AS
    v_po_status VARCHAR2(20);
BEGIN
    SELECT po_status INTO v_po_status FROM supplier_po WHERE po_id = p_po_id FOR UPDATE;

    IF v_po_status <> 'DRAFT' THEN
        RAISE_APPLICATION_ERROR(-20081, 'Items can only be added to DRAFT purchase orders.');
    END IF;

    INSERT INTO supplier_po_items (po_id, product_id, quantity_ord, unit_cost, line_total)
    VALUES (p_po_id, p_product_id, p_quantity, p_unit_cost, p_quantity * p_unit_cost);

    -- Update PO total
    UPDATE supplier_po
    SET total_amount = (
        SELECT NVL(SUM(line_total), 0)
        FROM   supplier_po_items
        WHERE  po_id = p_po_id
    )
    WHERE po_id = p_po_id;

    COMMIT;

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20082, 'Product ' || p_product_id || ' already on this PO. Update quantity instead.');
    WHEN OTHERS THEN
        ROLLBACK; RAISE;
END add_po_item;
/

-- ============================================================
-- PROCEDURE: submit_supplier_po
-- Moves PO from DRAFT to SUBMITTED for approval.
-- ============================================================
CREATE OR REPLACE PROCEDURE submit_supplier_po (
    p_po_id     IN NUMBER,
    p_user_id   IN NUMBER
) AS
    v_item_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_item_count FROM supplier_po_items WHERE po_id = p_po_id;

    IF v_item_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20083, 'Cannot submit empty PO. Add items first.');
    END IF;

    UPDATE supplier_po SET po_status = 'SUBMITTED'
    WHERE po_id = p_po_id AND po_status = 'DRAFT';

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20084, 'PO not in DRAFT status or not found.');
    END IF;

    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES ('SUPPLIER_PO', 'UPDATE', p_po_id, 'status=SUBMITTED');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('PO ' || p_po_id || ' submitted for approval.');

EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END submit_supplier_po;
/

-- ============================================================
-- PROCEDURE: approve_supplier_po
-- Manager/admin approves a submitted PO.
-- ============================================================
CREATE OR REPLACE PROCEDURE approve_supplier_po (
    p_po_id     IN NUMBER,
    p_user_id   IN NUMBER
) AS
BEGIN
    UPDATE supplier_po SET po_status = 'APPROVED'
    WHERE po_id = p_po_id AND po_status = 'SUBMITTED';

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20085, 'PO ' || p_po_id || ' is not in SUBMITTED status or does not exist.');
    END IF;

    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES ('SUPPLIER_PO', 'UPDATE', p_po_id, 'status=APPROVED by user_id=' || p_user_id);

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('PO ' || p_po_id || ' approved by user ' || p_user_id);

EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END approve_supplier_po;
/

-- ============================================================
-- PROCEDURE: receive_supplier_po
-- Records receipt of goods: increases inventory, creates batches.
-- Marks PO status as RECEIVED.
-- ============================================================
CREATE OR REPLACE PROCEDURE receive_supplier_po (
    p_po_id     IN NUMBER,
    p_user_id   IN NUMBER
) AS
    v_po_status VARCHAR2(20);
BEGIN
    SELECT po_status INTO v_po_status
    FROM supplier_po WHERE po_id = p_po_id FOR UPDATE;

    IF v_po_status NOT IN ('APPROVED','SHIPPED') THEN
        RAISE_APPLICATION_ERROR(
            -20086,
            'PO must be APPROVED or SHIPPED before receiving. Current status: ' || v_po_status
        );
    END IF;

    -- Process each line item
    FOR r IN (
        SELECT po_item_id, product_id, quantity_ord, unit_cost
        FROM   supplier_po_items
        WHERE  po_id = p_po_id
    ) LOOP
        -- Increase inventory stock
        update_inventory(
            p_product_id => r.product_id,
            p_delta      => r.quantity_ord,
            p_move_type  => 'PURCHASE',
            p_ref_id     => p_po_id,
            p_ref_type   => 'PO',
            p_user_id    => p_user_id,
            p_notes      => 'PO #' || p_po_id || ' received'
        );

        -- Update received quantity
        UPDATE supplier_po_items
        SET quantity_recv = quantity_ord
        WHERE po_item_id = r.po_item_id;

        -- Create batch traceability record
        INSERT INTO stock_batches (po_item_id, product_id, quantity)
        VALUES (r.po_item_id, r.product_id, r.quantity_ord);
    END LOOP;

    -- Mark PO as received
    UPDATE supplier_po
    SET po_status     = 'RECEIVED',
        received_date = SYSDATE
    WHERE po_id = p_po_id;

    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES ('SUPPLIER_PO', 'UPDATE', p_po_id,
            'status=RECEIVED by user_id=' || p_user_id || ' at ' || TO_CHAR(SYSDATE,'YYYY-MM-DD HH24:MI'));

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('PO ' || p_po_id || ' received. Stock increased and batches created.');

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20087, 'PO ID ' || p_po_id || ' not found.');
    WHEN OTHERS THEN
        ROLLBACK; RAISE;
END receive_supplier_po;
/

-- ============================================================
-- PROCEDURE: process_return
-- Approves or rejects a return request.
-- On approval: restocks GOOD items, issues refund payment record.
-- ============================================================
CREATE OR REPLACE PROCEDURE process_return (
    p_return_id IN NUMBER,
    p_user_id   IN NUMBER,
    p_approve   IN NUMBER,      -- 1 = APPROVE, 0 = REJECT
    p_notes     IN VARCHAR2 DEFAULT NULL
) AS
    v_order_id      NUMBER;
    v_refund_amt    NUMBER;
    v_ret_status    VARCHAR2(20);
BEGIN
    SELECT order_id, refund_amount, return_status
    INTO   v_order_id, v_refund_amt, v_ret_status
    FROM   returns
    WHERE  return_id = p_return_id
    FOR UPDATE;

    IF v_ret_status <> 'REQUESTED' THEN
        RAISE_APPLICATION_ERROR(-20090, 'Return ' || p_return_id || ' is already ' || v_ret_status);
    END IF;

    IF p_approve = 1 THEN
        -- Restock items in GOOD condition
        FOR r IN (
            SELECT oi.product_id, ri.quantity, ri.condition_code
            FROM   return_items ri
            JOIN   order_items  oi ON ri.order_item_id = oi.order_item_id
            WHERE  ri.return_id = p_return_id
        ) LOOP
            IF r.condition_code = 'GOOD' THEN
                update_inventory(
                    p_product_id => r.product_id,
                    p_delta      => r.quantity,
                    p_move_type  => 'RETURN',
                    p_ref_id     => p_return_id,
                    p_ref_type   => 'RETURN',
                    p_user_id    => p_user_id,
                    p_notes      => 'Return #' || p_return_id || ' restock'
                );
            END IF;
        END LOOP;

        -- Issue refund payment
        IF v_refund_amt > 0 THEN
            INSERT INTO payments (order_id, amount, payment_method, payment_status, notes)
            VALUES (v_order_id, v_refund_amt, 'BANK_TRANSFER', 'COMPLETED',
                    'Refund for return #' || p_return_id);
        END IF;

        -- Update return and order status
        UPDATE returns
        SET return_status = 'REFUNDED',
            processed_by  = p_user_id,
            processed_at  = SYSDATE
        WHERE return_id = p_return_id;

        UPDATE orders SET order_status = 'REFUNDED' WHERE order_id = v_order_id;

    ELSE
        -- Reject the return
        UPDATE returns
        SET return_status = 'REJECTED',
            processed_by  = p_user_id,
            processed_at  = SYSDATE
        WHERE return_id = p_return_id;
    END IF;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Return ' || p_return_id ||
                         CASE p_approve WHEN 1 THEN ' APPROVED and refunded.' ELSE ' REJECTED.' END);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20091, 'Return ID ' || p_return_id || ' not found.');
    WHEN OTHERS THEN
        ROLLBACK; RAISE;
END process_return;
/

PROMPT Supplier and return procedures created.
