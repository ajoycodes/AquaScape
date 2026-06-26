-- ============================================================
-- SEED: ORDERS & ORDER HISTORY
-- Uses place_order procedure via cart → order flow.
-- Also simulates some historical orders directly for reports.
-- ============================================================

PROMPT Seeding orders...

-- ── Method 1: Full cart→order flow (procedure-driven) ────────

-- Customer 1 (Emma) buys Neon Tetras, Java Fern, HOB Filter
DECLARE
    v_cid  NUMBER;
    v_oid  NUMBER;
    v_addr VARCHAR2(500);
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'emma.hartley@email.com';
    SELECT address     INTO v_addr FROM customers WHERE customer_id = v_cid;

    -- Populate cart
    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'), 10);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Java Fern'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Java Fern'), 3);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'AquaClear 50 HOB Filter'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'AquaClear 50 HOB Filter'), 1);

    -- Place order (creates with order_status = 'CONFIRMED')
    place_order(
        p_customer_id   => v_cid,
        p_shipping_addr => v_addr,
        p_discount_code => 'WELCOME10',
        p_order_id      => v_oid
    );

    -- Advance status to DELIVERED (simulating historical order)
    update_order_status(v_oid, 'PROCESSING', 1);
    update_order_status(v_oid, 'SHIPPED',    1);
    update_order_status(v_oid, 'DELIVERED',  1);

    DBMS_OUTPUT.PUT_LINE('Emma order placed: ' || v_oid);
END;
/

-- Customer 2 (Marcus) buys Guppies and tank
DECLARE
    v_cid  NUMBER;
    v_oid  NUMBER;
    v_addr VARCHAR2(500);
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'marcus.reid@email.com';
    SELECT address     INTO v_addr FROM customers WHERE customer_id = v_cid;

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Guppy (Assorted)'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Guppy (Assorted)'), 8);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'AquaClear 60L Starter Tank'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'AquaClear 60L Starter Tank'), 1);

    place_order(
        p_customer_id   => v_cid,
        p_shipping_addr => v_addr,
        p_order_id      => v_oid
    );
    update_order_status(v_oid, 'PROCESSING', 1);
    update_order_status(v_oid, 'SHIPPED',    1);
    update_order_status(v_oid, 'DELIVERED',  1);
    DBMS_OUTPUT.PUT_LINE('Marcus order placed: ' || v_oid);
END;
/

-- Customer 3 (Sofia) — Reef setup: Clownfish + Royal Gramma + Coral Decor
DECLARE
    v_cid  NUMBER;
    v_oid  NUMBER;
    v_addr VARCHAR2(500);
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'sofia.gonzalez@email.com';
    SELECT address     INTO v_addr FROM customers WHERE customer_id = v_cid;

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Ocellaris Clownfish'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Ocellaris Clownfish'), 2);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Royal Gramma'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Royal Gramma'), 1);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Coral Skeleton Decor'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Coral Skeleton Decor'), 2);

    place_order(
        p_customer_id   => v_cid,
        p_shipping_addr => v_addr,
        p_discount_code => 'REEF15',
        p_order_id      => v_oid
    );
    -- Order remains CONFIRMED (reef order pending processing)
    DBMS_OUTPUT.PUT_LINE('Sofia order placed: ' || v_oid);
END;
/

-- Customer 4 (Aiden) — Planted tank: Anubias, Amazon Sword, CO2, Pleco
DECLARE
    v_cid  NUMBER;
    v_oid  NUMBER;
    v_addr VARCHAR2(500);
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'aiden.patel@email.com';
    SELECT address     INTO v_addr FROM customers WHERE customer_id = v_cid;

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Anubias Barteri'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Anubias Barteri'), 4);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Amazon Sword'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Amazon Sword'), 3);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Bristlenose Pleco'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Bristlenose Pleco'), 2);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'CO2 Diffuser Kit'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'CO2 Diffuser Kit'), 1);

    place_order(
        p_customer_id   => v_cid,
        p_shipping_addr => v_addr,
        p_discount_code => 'SAVE20',
        p_order_id      => v_oid
    );
    update_order_status(v_oid, 'PROCESSING', 2);
    DBMS_OUTPUT.PUT_LINE('Aiden order placed: ' || v_oid);
END;
/

-- Customer 5 (Chloe) — order stays CONFIRMED
DECLARE
    v_cid  NUMBER;
    v_oid  NUMBER;
    v_addr VARCHAR2(500);
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'chloe.kim@email.com';
    SELECT address     INTO v_addr FROM customers WHERE customer_id = v_cid;

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Zebra Danio'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Zebra Danio'), 12);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = (SELECT product_id FROM products WHERE product_name = 'Hornwort'))
    WHEN NOT MATCHED THEN
        INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, (SELECT product_id FROM products WHERE product_name = 'Hornwort'), 5);

    place_order(
        p_customer_id   => v_cid,
        p_shipping_addr => v_addr,
        p_order_id      => v_oid
    );
    DBMS_OUTPUT.PUT_LINE('Chloe order placed (confirmed): ' || v_oid);
END;
/

-- ── Method 2: Backdated direct inserts for monthly report variety ──
-- Disable trigger to avoid ORA-04091 mutating table error
ALTER TRIGGER TRG_UPDATE_ORDER_TOTAL DISABLE;

DECLARE
    v_cid   NUMBER;
    v_oid   NUMBER;
    v_neon  NUMBER;
    v_guppy NUMBER;
BEGIN
    SELECT customer_id INTO v_cid   FROM customers WHERE email = 'james.thornton@email.com';
    SELECT product_id  INTO v_neon  FROM products  WHERE product_name = 'Neon Tetra';
    SELECT product_id  INTO v_guppy FROM products  WHERE product_name = 'Guppy (Assorted)';

    -- Order 3 months ago
    INSERT INTO orders (order_id, customer_id, order_status, subtotal, tax_amount, total_amount, order_date)
    VALUES (seq_order.NEXTVAL, v_cid, 'DELIVERED',
            39.90, 2.39, 42.29,
            ADD_MONTHS(SYSDATE, -3));

    SELECT MAX(order_id) INTO v_oid FROM orders WHERE customer_id = v_cid;

    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
    VALUES (seq_order_item.NEXTVAL, v_oid, v_neon,  10, 3.99, 39.90);

    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
    VALUES (seq_order_item.NEXTVAL, v_oid, v_guppy,  5, 2.99, 14.95);

    -- Order 5 months ago
    INSERT INTO orders (order_id, customer_id, order_status, subtotal, tax_amount, total_amount, order_date)
    VALUES (seq_order.NEXTVAL, v_cid, 'DELIVERED',
            59.99, 3.60, 63.59,
            ADD_MONTHS(SYSDATE, -5));

    SELECT MAX(order_id) INTO v_oid FROM orders WHERE customer_id = v_cid;

    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
    VALUES (seq_order_item.NEXTVAL, v_oid, v_neon, 15, 3.99, 59.85);

    COMMIT;
END;
/

DECLARE
    v_cid   NUMBER;
    v_oid   NUMBER;
    v_pid   NUMBER;
BEGIN
    SELECT customer_id INTO v_cid FROM customers WHERE email = 'priya.nair@email.com';
    SELECT product_id  INTO v_pid FROM products  WHERE product_name = 'ProSeries 120L Display Tank';

    INSERT INTO orders (order_id, customer_id, order_status, subtotal, tax_amount, total_amount, order_date)
    VALUES (seq_order.NEXTVAL, v_cid, 'DELIVERED',
            219.99, 13.20, 233.19,
            ADD_MONTHS(SYSDATE, -2));

    SELECT MAX(order_id) INTO v_oid FROM orders WHERE customer_id = v_cid;

    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
    VALUES (seq_order_item.NEXTVAL, v_oid, v_pid, 1, 219.99, 219.99);

    COMMIT;
END;
/

-- Re-enable trigger after direct inserts
ALTER TRIGGER TRG_UPDATE_ORDER_TOTAL ENABLE;

-- ── Aquarium Builder Setup Demo ────────────────────────────────

-- Create a demo setup for Emma (freshwater community tank)
DECLARE
    v_cid    NUMBER;
    v_tank   NUMBER;
    v_setup  NUMBER;
    v_pid1   NUMBER;
    v_pid2   NUMBER;
    v_pid3   NUMBER;
    v_pid4   NUMBER;
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'emma.hartley@email.com';
    SELECT tank_id     INTO v_tank FROM tanks t
        JOIN products p ON t.product_id = p.product_id
        WHERE p.product_name = 'AquaClear 60L Starter Tank';

    SELECT product_id INTO v_pid1 FROM products WHERE product_name = 'Corydoras Catfish';
    SELECT product_id INTO v_pid2 FROM products WHERE product_name = 'Guppy (Assorted)';
    SELECT product_id INTO v_pid3 FROM products WHERE product_name = 'Java Fern';
    SELECT product_id INTO v_pid4 FROM products WHERE product_name = 'Amazon Sword';

    create_aquarium_setup(
        p_customer_id  => v_cid,
        p_tank_id      => v_tank,
        p_setup_name   => 'Community Freshwater Garden',
        p_water_type   => 'FRESHWATER',
        p_target_temp  => 25,
        p_target_ph    => 7.0,
        p_description  => 'A peaceful community setup with schooling fish and lush planting.',
        p_setup_id     => v_setup
    );

    add_item_to_setup(v_setup, v_pid1, 'FISH',  4, NULL);
    add_item_to_setup(v_setup, v_pid2, 'FISH',  6, NULL);
    add_item_to_setup(v_setup, v_pid3, 'PLANT', 3, 'Attached to driftwood');
    add_item_to_setup(v_setup, v_pid4, 'PLANT', 2, 'Background plants');

    DBMS_OUTPUT.PUT_LINE('Demo setup created: ' || v_setup);
END;
/

COMMIT;
PROMPT Orders and builder setups seeded.
