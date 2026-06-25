-- ============================================================
-- SEED: CUSTOMERS (10 realistic records)
-- Each customer also gets an empty cart (via MERGE).
-- ============================================================

PROMPT Seeding customers...

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Emma', 'Hartley', 'emma.hartley@email.com', '555-1001', '14 Oak Lane, Portland OR 97201'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'emma.hartley@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Marcus', 'Reid', 'marcus.reid@email.com', '555-1002', '7 Pine St, Denver CO 80201'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'marcus.reid@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Sofia', 'Gonzalez', 'sofia.gonzalez@email.com', '555-1003', '230 Maple Ave, Austin TX 78701'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'sofia.gonzalez@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Aiden', 'Patel', 'aiden.patel@email.com', '555-1004', '88 Cedar Blvd, Boston MA 02101'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'aiden.patel@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Chloe', 'Kim', 'chloe.kim@email.com', '555-1005', '52 Birch Rd, Seattle WA 98101'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'chloe.kim@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'James', 'Thornton', 'james.thornton@email.com', '555-1006', '99 Walnut Ct, Nashville TN 37201'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'james.thornton@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Priya', 'Nair', 'priya.nair@email.com', '555-1007', '3 Elm St, San Jose CA 95101'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'priya.nair@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Noah', 'Fischer', 'noah.fischer@email.com', '555-1008', '17 Spruce Ave, Minneapolis MN 55401'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'noah.fischer@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Isabelle', 'Moreau', 'isabelle.moreau@email.com', '555-1009', '6 Willow Dr, New Orleans LA 70112'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'isabelle.moreau@email.com');

INSERT INTO customers (customer_id, first_name, last_name, email, phone, address)
SELECT seq_customer.NEXTVAL, 'Leo', 'Santos', 'leo.santos@email.com', '555-1010', '44 Chestnut Pl, Miami FL 33101'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'leo.santos@email.com');

-- Create a cart for each customer
DECLARE
    CURSOR c_custs IS SELECT customer_id FROM customers ORDER BY customer_id;
BEGIN
    FOR r IN c_custs LOOP
        MERGE INTO cart c
        USING DUAL ON (c.customer_id = r.customer_id)
        WHEN NOT MATCHED THEN
            INSERT (customer_id) VALUES (r.customer_id);
    END LOOP;
    COMMIT;
END;
/

PROMPT Customers seeded.
