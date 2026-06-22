-- ============================================================
-- MODULE 12: SEED DATA — MASTER FILE
-- Run this after all schema + procedures + triggers + views.
-- Calls each seed file in dependency order.
-- ============================================================

PROMPT ============================================================
PROMPT AquaScape Seed Data — Starting...
PROMPT ============================================================

@02_seed_roles_users.sql
@03_seed_suppliers.sql
@04_seed_categories.sql
@05_seed_products.sql
@06_seed_customers.sql
@07_seed_inventory.sql
@08_seed_compatibility.sql
@09_seed_orders.sql

PROMPT ============================================================
PROMPT Seed data complete.
PROMPT ============================================================
