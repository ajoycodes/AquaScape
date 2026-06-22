-- ============================================================
-- SEED CLEANUP / RESET SCRIPT
-- Run this BEFORE re-seeding to wipe all data cleanly.
-- Deletes in reverse FK order, then resets all sequences.
-- ============================================================

PROMPT Cleaning up existing seed data...

-- ── Dependent detail tables (deepest first) ─────────────────
DELETE FROM return_items;
DELETE FROM returns;
DELETE FROM payments;
DELETE FROM order_discounts;
DELETE FROM order_items;
DELETE FROM orders;

DELETE FROM cart_items;
DELETE FROM setup_items;
DELETE FROM saved_setups;
DELETE FROM aquarium_setups;
DELETE FROM wishlist;
DELETE FROM cart;

DELETE FROM compatibility_rules;
DELETE FROM low_stock_alerts;
DELETE FROM stock_batches;
DELETE FROM supplier_po_items;
DELETE FROM supplier_po;
DELETE FROM inventory_movements;
DELETE FROM inventory;

-- ── Product sub-type tables ──────────────────────────────────
DELETE FROM fish;
DELETE FROM plants;
DELETE FROM equipment;
DELETE FROM decorations;
DELETE FROM tanks;

-- ── Master tables ────────────────────────────────────────────
DELETE FROM products;
DELETE FROM discounts;
DELETE FROM categories;
DELETE FROM customers;
DELETE FROM users;
DELETE FROM roles;
DELETE FROM suppliers;

-- ── Audit log ────────────────────────────────────────────────
DELETE FROM audit_log;

COMMIT;
PROMPT All data deleted.

-- ── Reset sequences ──────────────────────────────────────────
ALTER SEQUENCE seq_role      RESTART START WITH 1;
ALTER SEQUENCE seq_user      RESTART START WITH 1;
ALTER SEQUENCE seq_customer  RESTART START WITH 1;
ALTER SEQUENCE seq_supplier  RESTART START WITH 1;
ALTER SEQUENCE seq_category  RESTART START WITH 1;
ALTER SEQUENCE seq_product   RESTART START WITH 1;
ALTER SEQUENCE seq_inventory RESTART START WITH 1;
ALTER SEQUENCE seq_tank      RESTART START WITH 1;
ALTER SEQUENCE seq_fish      RESTART START WITH 1;
ALTER SEQUENCE seq_plant     RESTART START WITH 1;
ALTER SEQUENCE seq_equipment RESTART START WITH 1;
ALTER SEQUENCE seq_deco      RESTART START WITH 1;

ALTER SEQUENCE seq_setup      RESTART START WITH 1;
ALTER SEQUENCE seq_setup_item RESTART START WITH 1;
ALTER SEQUENCE seq_compat_rule RESTART START WITH 1;
ALTER SEQUENCE seq_saved_setup RESTART START WITH 1;
ALTER SEQUENCE seq_wishlist   RESTART START WITH 1;
ALTER SEQUENCE seq_cart       RESTART START WITH 1;
ALTER SEQUENCE seq_cart_item  RESTART START WITH 1;

ALTER SEQUENCE seq_discount   RESTART START WITH 1;
ALTER SEQUENCE seq_order      RESTART START WITH 1000;
ALTER SEQUENCE seq_order_item RESTART START WITH 1;
ALTER SEQUENCE seq_payment    RESTART START WITH 1;
ALTER SEQUENCE seq_return     RESTART START WITH 1;
ALTER SEQUENCE seq_return_item RESTART START WITH 1;

ALTER SEQUENCE seq_spo        RESTART START WITH 5000;
ALTER SEQUENCE seq_spo_item   RESTART START WITH 1;
ALTER SEQUENCE seq_batch      RESTART START WITH 1;
ALTER SEQUENCE seq_alert      RESTART START WITH 1;
ALTER SEQUENCE seq_inv_move   RESTART START WITH 1;

PROMPT Sequences reset.
PROMPT Cleanup complete — ready to re-seed.
