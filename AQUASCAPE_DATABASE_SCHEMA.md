# AquaScape Database Schema Data Dictionary

This document provides a formal, Data Dictionary-style specification of the AquaScape Oracle Database schema. It is derived from the current SQL files in `database/schema` and records the physical column names, Oracle data types, nullability, defaults, keys, checks, and referential actions.

Most primary keys use Oracle sequences through `DEFAULT <sequence>.NEXTVAL`. `AUDIT_LOG.AUDIT_ID` is the single identity-based key. Unless explicitly shown, foreign keys use Oracle's default delete behavior (`NO ACTION`).

## Schema overview

| Domain | Tables | Purpose |
|---|---:|---|
| Core catalogue | 12 | Identity, customers, suppliers, products, stock, and subtype specifications |
| Aquarium builder | 7 | Aquarium designs, compatibility, saved setups, wishlist, and cart |
| Orders | 7 | Discounts, sales orders, payments, and returns |
| Supply and control | 6 | Purchase orders, stock receipts, alerts, movement ledger, and auditing |
| **Total** | **32** | |

---

## 1. `ROLES`
**Description:** System role definitions for access control.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `ROLE_ID` | `NUMBER` | No | `SEQ_ROLE.NEXTVAL` | **PK** |
| `ROLE_NAME` | `VARCHAR2(50)` | No | | **UNIQUE**; `CHECK (TRIM(role_name) IS NOT NULL)` |
| `DESCRIPTION` | `VARCHAR2(255)` | Yes | | |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 2. `USERS`
**Description:** Administrator and staff accounts with role assignment.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `USER_ID` | `NUMBER` | No | `SEQ_USER.NEXTVAL` | **PK** |
| `ROLE_ID` | `NUMBER` | No | | **FK** &rarr; `ROLES(ROLE_ID)` |
| `USERNAME` | `VARCHAR2(50)` | No | | **UNIQUE** |
| `EMAIL` | `VARCHAR2(100)` | No | | **UNIQUE**; `CHECK (email LIKE '%@%.%')` |
| `PASSWORD_HASH` | `VARCHAR2(255)` | No | | Scrypt/Bcrypt-compatible application password hash; never plain text |
| `IS_ACTIVE` | `NUMBER(1)` | Yes | `1` | `CHECK (is_active IN (0, 1))` |
| `LAST_LOGIN` | `DATE` | Yes | | |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 3. `CUSTOMERS`
**Description:** Registered aquarium buyers and hobbyists. Authentication support is added by `05_auth_migration.sql`.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `CUSTOMER_ID` | `NUMBER` | No | `SEQ_CUSTOMER.NEXTVAL` | **PK** |
| `FIRST_NAME` | `VARCHAR2(60)` | No | | |
| `LAST_NAME` | `VARCHAR2(60)` | No | | |
| `EMAIL` | `VARCHAR2(100)` | No | | **UNIQUE**; `CHECK (email LIKE '%@%.%')` |
| `PHONE` | `VARCHAR2(20)` | Yes | | |
| `ADDRESS` | `VARCHAR2(500)` | Yes | | |
| `CITY` | `VARCHAR2(80)` | Yes | | |
| `COUNTRY` | `VARCHAR2(60)` | Yes | `'Malaysia'` | |
| `IS_ACTIVE` | `NUMBER(1)` | Yes | `1` | `CHECK (is_active IN (0, 1))` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |
| `PASSWORD_HASH` | `VARCHAR2(255)` | Yes | | Scrypt `salt:hash`; added by authentication migration |

---

## 4. `SUPPLIERS`
**Description:** Vendor profiles used for procurement.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `SUPPLIER_ID` | `NUMBER` | No | `SEQ_SUPPLIER.NEXTVAL` | **PK** |
| `SUPPLIER_NAME` | `VARCHAR2(150)` | No | | |
| `CONTACT_NAME` | `VARCHAR2(100)` | Yes | | |
| `EMAIL` | `VARCHAR2(100)` | Yes | | **UNIQUE** |
| `PHONE` | `VARCHAR2(20)` | Yes | | |
| `ADDRESS` | `VARCHAR2(500)` | Yes | | |
| `CITY` | `VARCHAR2(80)` | Yes | | |
| `COUNTRY` | `VARCHAR2(60)` | Yes | | |
| `PAYMENT_TERMS` | `VARCHAR2(100)` | Yes | | Examples: `NET30`, `COD` |
| `IS_ACTIVE` | `NUMBER(1)` | Yes | `1` | `CHECK (is_active IN (0, 1))` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 5. `CATEGORIES`
**Description:** Self-referencing product taxonomy. A null parent identifies a root category.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `CATEGORY_ID` | `NUMBER` | No | `SEQ_CATEGORY.NEXTVAL` | **PK** |
| `CATEGORY_NAME` | `VARCHAR2(100)` | No | | **UNIQUE** |
| `PARENT_ID` | `NUMBER` | Yes | | **FK** &rarr; `CATEGORIES(CATEGORY_ID)`; `CHECK (parent_id <> category_id)` |
| `DESCRIPTION` | `VARCHAR2(300)` | Yes | | |
| `SORT_ORDER` | `NUMBER` | Yes | `0` | |

---

## 6. `PRODUCTS`
**Description:** Master catalogue for every sellable fish, plant, tank, equipment item, or decoration.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `PRODUCT_ID` | `NUMBER` | No | `SEQ_PRODUCT.NEXTVAL` | **PK** |
| `CATEGORY_ID` | `NUMBER` | No | | **FK** &rarr; `CATEGORIES(CATEGORY_ID)` |
| `PRODUCT_NAME` | `VARCHAR2(150)` | No | | |
| `PRODUCT_TYPE` | `VARCHAR2(20)` | No | | `CHECK (product_type IN ('FISH','PLANT','TANK','EQUIPMENT','DECORATION'))` |
| `SKU` | `VARCHAR2(50)` | Yes | | **UNIQUE** |
| `UNIT_PRICE` | `NUMBER(10,2)` | No | | `CHECK (unit_price >= 0)` |
| `COST_PRICE` | `NUMBER(10,2)` | Yes | | `CHECK (cost_price >= 0 OR cost_price IS NULL)` |
| `DESCRIPTION` | `VARCHAR2(1000)` | Yes | | |
| `IMAGE_URL` | `VARCHAR2(500)` | Yes | | |
| `IS_ACTIVE` | `NUMBER(1)` | Yes | `1` | `CHECK (is_active IN (0, 1))` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |
| `UPDATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 7. `INVENTORY`
**Description:** One stock-level and reorder-configuration record per product.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `INVENTORY_ID` | `NUMBER` | No | `SEQ_INVENTORY.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `QTY_ON_HAND` | `NUMBER` | Yes | `0` | `CHECK (qty_on_hand >= 0)` |
| `QTY_RESERVED` | `NUMBER` | Yes | `0` | `CHECK (qty_reserved >= 0)` |
| `REORDER_LEVEL` | `NUMBER` | Yes | `10` | `CHECK (reorder_level >= 0)` |
| `REORDER_QTY` | `NUMBER` | Yes | `50` | `CHECK (reorder_qty > 0)` |
| `LAST_UPDATED` | `DATE` | Yes | `SYSDATE` | |

---

## 8. Product subtype tables
**Description:** One-to-one extensions of `PRODUCTS` for type-specific aquarium data. Each `PRODUCT_ID` is unique within its subtype table.

### `TANKS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `TANK_ID` | `NUMBER` | No | `SEQ_TANK.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `VOLUME_LITERS` | `NUMBER(8,2)` | No | | `CHECK (volume_liters > 0)` |
| `LENGTH_CM` | `NUMBER(6,2)` | Yes | | |
| `WIDTH_CM` | `NUMBER(6,2)` | Yes | | |
| `HEIGHT_CM` | `NUMBER(6,2)` | Yes | | |
| `MATERIAL` | `VARCHAR2(20)` | Yes | | `CHECK (material IN ('GLASS','ACRYLIC','OTHER') OR material IS NULL)` |
| `SHAPE` | `VARCHAR2(20)` | Yes | | `CHECK (shape IN ('RECTANGULAR','BOWFRONT','HEX','CYLINDRICAL','CUBE','OTHER') OR shape IS NULL)` |
| `HAS_HOOD` | `NUMBER(1)` | Yes | `0` | `CHECK (has_hood IN (0, 1))` |

### `FISH`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `FISH_ID` | `NUMBER` | No | `SEQ_FISH.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `SPECIES` | `VARCHAR2(150)` | No | | |
| `COMMON_NAME` | `VARCHAR2(100)` | Yes | | |
| `WATER_TYPE` | `VARCHAR2(20)` | No | | `CHECK (water_type IN ('FRESHWATER','SALTWATER','BRACKISH'))` |
| `MIN_TEMP_C` | `NUMBER(5,2)` | No | | Range checks: `min_temp_c < max_temp_c`; 0–40°C |
| `MAX_TEMP_C` | `NUMBER(5,2)` | No | | Range checks: `min_temp_c < max_temp_c`; 0–40°C |
| `MIN_PH` | `NUMBER(4,2)` | Yes | | 0–14 when supplied; must be less than `MAX_PH` when both exist |
| `MAX_PH` | `NUMBER(4,2)` | Yes | | Must exceed `MIN_PH` when both exist |
| `MIN_TANK_LITERS` | `NUMBER(8,2)` | Yes | | |
| `MAX_FISH_PER_LITER` | `NUMBER(6,4)` | Yes | | Stocking-density cap |
| `IS_AGGRESSIVE` | `NUMBER(1)` | Yes | `0` | `CHECK (is_aggressive IN (0, 1))` |
| `CARE_LEVEL` | `VARCHAR2(10)` | Yes | | `CHECK (care_level IN ('EASY','MEDIUM','HARD') OR care_level IS NULL)` |
| `ORIGIN_REGION` | `VARCHAR2(100)` | Yes | | |
| `LIFESPAN_YEARS` | `NUMBER(4,1)` | Yes | | |

### `PLANTS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `PLANT_ID` | `NUMBER` | No | `SEQ_PLANT.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `SPECIES` | `VARCHAR2(150)` | Yes | | |
| `COMMON_NAME` | `VARCHAR2(100)` | Yes | | |
| `WATER_TYPE` | `VARCHAR2(20)` | No | | `CHECK (water_type IN ('FRESHWATER','SALTWATER','BRACKISH'))` |
| `MIN_TEMP_C` | `NUMBER(5,2)` | Yes | | Must be less than `MAX_TEMP_C` when both exist |
| `MAX_TEMP_C` | `NUMBER(5,2)` | Yes | | Must exceed `MIN_TEMP_C` when both exist |
| `LIGHT_REQUIREMENT` | `VARCHAR2(10)` | Yes | | `CHECK (light_requirement IN ('LOW','MEDIUM','HIGH') OR light_requirement IS NULL)` |
| `CO2_REQUIRED` | `NUMBER(1)` | Yes | `0` | `CHECK (co2_required IN (0, 1))` |
| `GROWTH_RATE` | `VARCHAR2(10)` | Yes | | `CHECK (growth_rate IN ('SLOW','MEDIUM','FAST') OR growth_rate IS NULL)` |
| `PLACEMENT` | `VARCHAR2(20)` | Yes | | `CHECK (placement IN ('FOREGROUND','MIDGROUND','BACKGROUND','FLOATING') OR placement IS NULL)` |

### `EQUIPMENT`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `EQUIPMENT_ID` | `NUMBER` | No | `SEQ_EQUIPMENT.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `EQUIPMENT_TYPE` | `VARCHAR2(20)` | No | | `CHECK (equipment_type IN ('FILTER','HEATER','LIGHT','PUMP','CO2_SYSTEM','SKIMMER','UV_STERILIZER','OTHER'))` |
| `POWER_WATTS` | `NUMBER(8,2)` | Yes | | `CHECK (power_watts IS NULL OR power_watts >= 0)` |
| `SUITABLE_LITERS_MIN` | `NUMBER(8,2)` | Yes | | Must be less than `SUITABLE_LITERS_MAX` when both exist |
| `SUITABLE_LITERS_MAX` | `NUMBER(8,2)` | Yes | | Must exceed `SUITABLE_LITERS_MIN` when both exist |
| `VOLTAGE` | `VARCHAR2(20)` | Yes | | |
| `BRAND` | `VARCHAR2(100)` | Yes | | |
| `MODEL_NUMBER` | `VARCHAR2(100)` | Yes | | |

### `DECORATIONS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `DECORATION_ID` | `NUMBER` | No | `SEQ_DECO.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `DECO_TYPE` | `VARCHAR2(30)` | Yes | | `CHECK (deco_type IN ('ROCK','DRIFTWOOD','CASTLE','CAVE','SUBSTRATE','CORAL','PLANT_REPLICA','OTHER') OR deco_type IS NULL)` |
| `MATERIAL` | `VARCHAR2(50)` | Yes | | |
| `IS_NATURAL` | `NUMBER(1)` | Yes | `0` | `CHECK (is_natural IN (0, 1))` |
| `SAFE_WATER_TYPE` | `VARCHAR2(20)` | Yes | | `CHECK (safe_water_type IN ('FRESHWATER','SALTWATER','BOTH') OR safe_water_type IS NULL)` |
| `SIZE_CLASS` | `VARCHAR2(15)` | Yes | | `CHECK (size_class IN ('SMALL','MEDIUM','LARGE','XL') OR size_class IS NULL)` |

---

## 9. `AQUARIUM_SETUPS`
**Description:** Customer-designed aquarium configurations.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `SETUP_ID` | `NUMBER` | No | `SEQ_SETUP.NEXTVAL` | **PK** |
| `CUSTOMER_ID` | `NUMBER` | No | | **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)` |
| `TANK_ID` | `NUMBER` | No | | **FK** &rarr; `TANKS(TANK_ID)` |
| `SETUP_NAME` | `VARCHAR2(150)` | No | | |
| `WATER_TYPE` | `VARCHAR2(20)` | No | | `CHECK (water_type IN ('FRESHWATER','SALTWATER','BRACKISH'))` |
| `TARGET_TEMP_C` | `NUMBER(5,2)` | Yes | | `CHECK (target_temp_c IS NULL OR target_temp_c BETWEEN 0 AND 40)` |
| `TARGET_PH` | `NUMBER(4,2)` | Yes | | `CHECK (target_ph IS NULL OR target_ph BETWEEN 0 AND 14)` |
| `DESCRIPTION` | `VARCHAR2(500)` | Yes | | |
| `STATUS` | `VARCHAR2(20)` | Yes | `'DRAFT'` | `CHECK (status IN ('DRAFT','SAVED','ORDERED','ARCHIVED'))` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |
| `UPDATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 10. `SETUP_ITEMS`
**Description:** Products included in an aquarium setup design.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `SETUP_ITEM_ID` | `NUMBER` | No | `SEQ_SETUP_ITEM.NEXTVAL` | **PK** |
| `SETUP_ID` | `NUMBER` | No | | **FK** &rarr; `AQUARIUM_SETUPS(SETUP_ID)` `ON DELETE CASCADE`; composite **UNIQUE** with `PRODUCT_ID` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `SETUP_ID` |
| `ITEM_TYPE` | `VARCHAR2(20)` | No | | `CHECK (item_type IN ('FISH','PLANT','EQUIPMENT','DECORATION'))` |
| `QUANTITY` | `NUMBER` | Yes | `1` | `CHECK (quantity > 0)` |
| `NOTES` | `VARCHAR2(500)` | Yes | | |
| `ADDED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 11. `COMPATIBILITY_RULES`
**Description:** Administrator-defined rules governing which products may coexist in a setup.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `RULE_ID` | `NUMBER` | No | `SEQ_COMPAT_RULE.NEXTVAL` | **PK** |
| `PRODUCT_ID_A` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `PRODUCT_ID_B` |
| `PRODUCT_ID_B` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; `CHECK (product_id_a <> product_id_b)` |
| `RULE_TYPE` | `VARCHAR2(20)` | No | | `CHECK (rule_type IN ('INCOMPATIBLE','REQUIRES','NEUTRAL'))` |
| `REASON` | `VARCHAR2(500)` | Yes | | |
| `SEVERITY` | `VARCHAR2(10)` | Yes | `'WARNING'` | `CHECK (severity IN ('WARNING','ERROR'))` |
| `CREATED_BY` | `NUMBER` | Yes | | **FK** &rarr; `USERS(USER_ID)` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 12. `SAVED_SETUPS`
**Description:** Public or shareable snapshots of finalized aquarium designs.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `SAVED_ID` | `NUMBER` | No | `SEQ_SAVED_SETUP.NEXTVAL` | **PK** |
| `SETUP_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `AQUARIUM_SETUPS(SETUP_ID)` |
| `CUSTOMER_ID` | `NUMBER` | No | | **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)` |
| `SHARE_CODE` | `VARCHAR2(20)` | Yes | | **UNIQUE** |
| `IS_PUBLIC` | `NUMBER(1)` | Yes | `0` | `CHECK (is_public IN (0, 1))` |
| `SAVED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 13. `WISHLIST`, `CART`, and `CART_ITEMS`
**Description:** Customer shopping intent and active-cart storage.

### `WISHLIST`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `WISHLIST_ID` | `NUMBER` | No | `SEQ_WISHLIST.NEXTVAL` | **PK** |
| `CUSTOMER_ID` | `NUMBER` | No | | **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)`; composite **UNIQUE** with `PRODUCT_ID` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `CUSTOMER_ID` |
| `ADDED_AT` | `DATE` | Yes | `SYSDATE` | |

### `CART`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `CART_ID` | `NUMBER` | No | `SEQ_CART.NEXTVAL` | **PK** |
| `CUSTOMER_ID` | `NUMBER` | No | | **UNIQUE**, **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |
| `UPDATED_AT` | `DATE` | Yes | `SYSDATE` | |

### `CART_ITEMS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `CART_ITEM_ID` | `NUMBER` | No | `SEQ_CART_ITEM.NEXTVAL` | **PK** |
| `CART_ID` | `NUMBER` | No | | **FK** &rarr; `CART(CART_ID)` `ON DELETE CASCADE`; composite **UNIQUE** with `PRODUCT_ID` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `CART_ID` |
| `QUANTITY` | `NUMBER` | Yes | `1` | `CHECK (quantity > 0)` |
| `ADDED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 14. `DISCOUNTS`
**Description:** Percentage and fixed-value promotional codes.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `DISCOUNT_ID` | `NUMBER` | No | `SEQ_DISCOUNT.NEXTVAL` | **PK** |
| `CODE` | `VARCHAR2(50)` | No | | **UNIQUE** |
| `DISCOUNT_TYPE` | `VARCHAR2(10)` | No | | `CHECK (discount_type IN ('PERCENT','FIXED'))` |
| `VALUE` | `NUMBER(10,2)` | No | | `CHECK (value > 0)`; percentage values capped at 100 |
| `MIN_ORDER_AMT` | `NUMBER(10,2)` | Yes | `0` | `CHECK (min_order_amt >= 0)` |
| `MAX_USES` | `NUMBER` | Yes | | Null means unlimited |
| `USED_COUNT` | `NUMBER` | Yes | `0` | `CHECK (used_count >= 0)` |
| `VALID_FROM` | `DATE` | Yes | | Must precede `VALID_UNTIL` when both exist |
| `VALID_UNTIL` | `DATE` | Yes | | Must follow `VALID_FROM` when both exist |
| `IS_ACTIVE` | `NUMBER(1)` | Yes | `1` | `CHECK (is_active IN (0, 1))` |
| `CREATED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 15. `ORDERS`
**Description:** Sales order header linking a customer and, optionally, an aquarium-builder setup.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `ORDER_ID` | `NUMBER` | No | `SEQ_ORDER.NEXTVAL` | **PK**; sequence starts at 1000 |
| `CUSTOMER_ID` | `NUMBER` | No | | **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)` |
| `SETUP_ID` | `NUMBER` | Yes | | **FK** &rarr; `AQUARIUM_SETUPS(SETUP_ID)` |
| `ORDER_DATE` | `DATE` | Yes | `SYSDATE` | |
| `ORDER_STATUS` | `VARCHAR2(20)` | Yes | `'PENDING'` | `CHECK (order_status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'))` |
| `SUBTOTAL` | `NUMBER(12,2)` | Yes | `0` | `CHECK (subtotal >= 0)` |
| `DISCOUNT_TOTAL` | `NUMBER(12,2)` | Yes | `0` | `CHECK (discount_total >= 0)` |
| `TAX_AMOUNT` | `NUMBER(12,2)` | Yes | `0` | `CHECK (tax_amount >= 0)` |
| `TOTAL_AMOUNT` | `NUMBER(12,2)` | Yes | `0` | `CHECK (total_amount >= 0)` |
| `SHIPPING_ADDR` | `VARCHAR2(500)` | Yes | | |
| `NOTES` | `VARCHAR2(1000)` | Yes | | |

---

## 16. `ORDER_ITEMS` and `ORDER_DISCOUNTS`
**Description:** Purchased products and discounts attached to an order.

### `ORDER_ITEMS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `ORDER_ITEM_ID` | `NUMBER` | No | `SEQ_ORDER_ITEM.NEXTVAL` | **PK** |
| `ORDER_ID` | `NUMBER` | No | | **FK** &rarr; `ORDERS(ORDER_ID)`; composite **UNIQUE** with `PRODUCT_ID` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `ORDER_ID` |
| `QUANTITY` | `NUMBER` | No | | `CHECK (quantity > 0)` |
| `UNIT_PRICE` | `NUMBER(10,2)` | No | | `CHECK (unit_price >= 0)`; price snapshot |
| `LINE_TOTAL` | `NUMBER(12,2)` | No | | `CHECK (line_total >= 0)` |

### `ORDER_DISCOUNTS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `ORDER_ID` | `NUMBER` | No | | Composite **PK**; **FK** &rarr; `ORDERS(ORDER_ID)` |
| `DISCOUNT_ID` | `NUMBER` | No | | Composite **PK**; **FK** &rarr; `DISCOUNTS(DISCOUNT_ID)` |
| `APPLIED_AMT` | `NUMBER(10,2)` | No | | `CHECK (applied_amt >= 0)` |
| `APPLIED_AT` | `DATE` | Yes | `SYSDATE` | |

---

## 17. `PAYMENTS`
**Description:** One or more payment transactions associated with an order.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `PAYMENT_ID` | `NUMBER` | No | `SEQ_PAYMENT.NEXTVAL` | **PK** |
| `ORDER_ID` | `NUMBER` | No | | **FK** &rarr; `ORDERS(ORDER_ID)` |
| `PAYMENT_DATE` | `DATE` | Yes | `SYSDATE` | |
| `AMOUNT` | `NUMBER(12,2)` | No | | `CHECK (amount > 0)` |
| `PAYMENT_METHOD` | `VARCHAR2(20)` | No | | `CHECK (payment_method IN ('CASH','CARD','BANK_TRANSFER','E_WALLET'))` |
| `PAYMENT_STATUS` | `VARCHAR2(20)` | Yes | `'PENDING'` | `CHECK (payment_status IN ('PENDING','COMPLETED','FAILED','REFUNDED'))` |
| `TRANSACTION_REF` | `VARCHAR2(100)` | Yes | | |
| `NOTES` | `VARCHAR2(300)` | Yes | | |

---

## 18. `RETURNS` and `RETURN_ITEMS`
**Description:** Customer return requests and the order lines included in each return.

### `RETURNS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `RETURN_ID` | `NUMBER` | No | `SEQ_RETURN.NEXTVAL` | **PK** |
| `ORDER_ID` | `NUMBER` | No | | **FK** &rarr; `ORDERS(ORDER_ID)` |
| `CUSTOMER_ID` | `NUMBER` | No | | **FK** &rarr; `CUSTOMERS(CUSTOMER_ID)` |
| `RETURN_DATE` | `DATE` | Yes | `SYSDATE` | |
| `REASON` | `VARCHAR2(500)` | Yes | | |
| `RETURN_STATUS` | `VARCHAR2(20)` | Yes | `'REQUESTED'` | `CHECK (return_status IN ('REQUESTED','APPROVED','REJECTED','REFUNDED'))` |
| `REFUND_AMOUNT` | `NUMBER(12,2)` | Yes | | `CHECK (refund_amount IS NULL OR refund_amount >= 0)` |
| `PROCESSED_BY` | `NUMBER` | Yes | | **FK** &rarr; `USERS(USER_ID)` |
| `PROCESSED_AT` | `DATE` | Yes | | |

### `RETURN_ITEMS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `RETURN_ITEM_ID` | `NUMBER` | No | `SEQ_RETURN_ITEM.NEXTVAL` | **PK** |
| `RETURN_ID` | `NUMBER` | No | | **FK** &rarr; `RETURNS(RETURN_ID)`; composite **UNIQUE** with `ORDER_ITEM_ID` |
| `ORDER_ITEM_ID` | `NUMBER` | No | | **FK** &rarr; `ORDER_ITEMS(ORDER_ITEM_ID)`; composite **UNIQUE** with `RETURN_ID` |
| `QUANTITY` | `NUMBER` | No | | `CHECK (quantity > 0)` |
| `CONDITION_CODE` | `VARCHAR2(15)` | Yes | | `CHECK (condition_code IN ('GOOD','DAMAGED','DEAD','OTHER') OR condition_code IS NULL)` |

---

## 19. `SUPPLIER_PO` and `SUPPLIER_PO_ITEMS`
**Description:** Purchase orders sent by AquaScape to suppliers and their requested products.

### `SUPPLIER_PO`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `PO_ID` | `NUMBER` | No | `SEQ_SPO.NEXTVAL` | **PK**; sequence starts at 5000 |
| `SUPPLIER_ID` | `NUMBER` | No | | **FK** &rarr; `SUPPLIERS(SUPPLIER_ID)` |
| `CREATED_BY` | `NUMBER` | No | | **FK** &rarr; `USERS(USER_ID)` |
| `PO_DATE` | `DATE` | Yes | `SYSDATE` | |
| `EXPECTED_DATE` | `DATE` | Yes | | |
| `RECEIVED_DATE` | `DATE` | Yes | | `CHECK (expected_date IS NULL OR received_date IS NULL OR received_date >= po_date)` |
| `PO_STATUS` | `VARCHAR2(20)` | Yes | `'DRAFT'` | `CHECK (po_status IN ('DRAFT','SUBMITTED','APPROVED','SHIPPED','RECEIVED','CANCELLED'))` |
| `TOTAL_AMOUNT` | `NUMBER(12,2)` | Yes | `0` | `CHECK (total_amount >= 0)` |
| `NOTES` | `VARCHAR2(1000)` | Yes | | |

### `SUPPLIER_PO_ITEMS`
| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `PO_ITEM_ID` | `NUMBER` | No | `SEQ_SPO_ITEM.NEXTVAL` | **PK** |
| `PO_ID` | `NUMBER` | No | | **FK** &rarr; `SUPPLIER_PO(PO_ID)`; composite **UNIQUE** with `PRODUCT_ID` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)`; composite **UNIQUE** with `PO_ID` |
| `QUANTITY_ORD` | `NUMBER` | No | | `CHECK (quantity_ord > 0)` |
| `QUANTITY_RECV` | `NUMBER` | Yes | `0` | `CHECK (quantity_recv >= 0 AND quantity_recv <= quantity_ord)` |
| `UNIT_COST` | `NUMBER(10,2)` | No | | `CHECK (unit_cost >= 0)` |
| `LINE_TOTAL` | `NUMBER(12,2)` | No | | `CHECK (line_total >= 0)` |

---

## 20. `STOCK_BATCHES`
**Description:** Traceable batches created when purchase-order items are received.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `BATCH_ID` | `NUMBER` | No | `SEQ_BATCH.NEXTVAL` | **PK** |
| `PO_ITEM_ID` | `NUMBER` | No | | **FK** &rarr; `SUPPLIER_PO_ITEMS(PO_ITEM_ID)` |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `QUANTITY` | `NUMBER` | No | | `CHECK (quantity > 0)` |
| `RECEIVED_DATE` | `DATE` | Yes | `SYSDATE` | |
| `EXPIRY_DATE` | `DATE` | Yes | | `CHECK (expiry_date IS NULL OR expiry_date >= received_date)` |
| `BATCH_NOTES` | `VARCHAR2(500)` | Yes | | |

---

## 21. `LOW_STOCK_ALERTS`
**Description:** Alerts generated when inventory reaches its configured reorder level.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `ALERT_ID` | `NUMBER` | No | `SEQ_ALERT.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `ALERT_DATE` | `DATE` | Yes | `SYSDATE` | |
| `QTY_AT_ALERT` | `NUMBER` | No | | `CHECK (qty_at_alert >= 0)` |
| `REORDER_LEVEL` | `NUMBER` | No | | `CHECK (reorder_level >= 0)` |
| `IS_RESOLVED` | `NUMBER(1)` | Yes | `0` | `CHECK (is_resolved IN (0, 1))` |
| `RESOLVED_AT` | `DATE` | Yes | | |
| `RESOLVED_BY` | `NUMBER` | Yes | | **FK** &rarr; `USERS(USER_ID)` |

---

## 22. `INVENTORY_MOVEMENTS`
**Description:** Immutable ledger of inventory changes; positive quantities represent stock-in and negative quantities stock-out.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `MOVEMENT_ID` | `NUMBER` | No | `SEQ_INV_MOVE.NEXTVAL` | **PK** |
| `PRODUCT_ID` | `NUMBER` | No | | **FK** &rarr; `PRODUCTS(PRODUCT_ID)` |
| `MOVEMENT_TYPE` | `VARCHAR2(20)` | No | | `CHECK (movement_type IN ('SALE','PURCHASE','RETURN','ADJUSTMENT','DAMAGE','RESERVED','UNRESERVED'))` |
| `QUANTITY_DELTA` | `NUMBER` | No | | Positive = in; negative = out |
| `QTY_AFTER` | `NUMBER` | Yes | | Post-movement stock snapshot |
| `REFERENCE_ID` | `NUMBER` | Yes | | Polymorphic source-record identifier |
| `REFERENCE_TYPE` | `VARCHAR2(20)` | Yes | | `CHECK (reference_type IN ('ORDER','PO','RETURN','ADJUSTMENT','SETUP') OR reference_type IS NULL)` |
| `MOVED_AT` | `DATE` | Yes | `SYSDATE` | |
| `PERFORMED_BY` | `NUMBER` | Yes | | **FK** &rarr; `USERS(USER_ID)` |
| `NOTES` | `VARCHAR2(500)` | Yes | | |

---

## 23. `AUDIT_LOG`
**Description:** Generic DML audit trail populated by audit triggers.

| Column Name | Data Type | Nullable | Default | Constraints / Keys |
|---|---|---|---|---|
| `AUDIT_ID` | `NUMBER` | No | `GENERATED ALWAYS AS IDENTITY` | **PK** |
| `TABLE_NAME` | `VARCHAR2(50)` | No | | |
| `OPERATION` | `VARCHAR2(10)` | No | | `CHECK (operation IN ('INSERT','UPDATE','DELETE'))` |
| `RECORD_ID` | `NUMBER` | Yes | | |
| `CHANGED_BY` | `VARCHAR2(60)` | Yes | `SYS_CONTEXT('USERENV','SESSION_USER')` | Database session user |
| `CHANGED_AT` | `DATE` | Yes | `SYSDATE` | |
| `OLD_VALUES` | `VARCHAR2(4000)` | Yes | | Before-image snapshot |
| `NEW_VALUES` | `VARCHAR2(4000)` | Yes | | After-image snapshot |

---

## Referential relationship summary

| Parent | Child tables |
|---|---|
| `ROLES` | `USERS` |
| `USERS` | `COMPATIBILITY_RULES`, `RETURNS`, `SUPPLIER_PO`, `LOW_STOCK_ALERTS`, `INVENTORY_MOVEMENTS` |
| `CUSTOMERS` | `AQUARIUM_SETUPS`, `SAVED_SETUPS`, `WISHLIST`, `CART`, `ORDERS`, `RETURNS` |
| `SUPPLIERS` | `SUPPLIER_PO` |
| `CATEGORIES` | `CATEGORIES` (self-reference), `PRODUCTS` |
| `PRODUCTS` | `INVENTORY`, all product subtypes, builder/cart/order/PO line tables, compatibility rules, stock tables |
| `TANKS` | `AQUARIUM_SETUPS` |
| `AQUARIUM_SETUPS` | `SETUP_ITEMS`, `SAVED_SETUPS`, `ORDERS` |
| `CART` | `CART_ITEMS` (`ON DELETE CASCADE`) |
| `ORDERS` | `ORDER_ITEMS`, `ORDER_DISCOUNTS`, `PAYMENTS`, `RETURNS` |
| `DISCOUNTS` | `ORDER_DISCOUNTS` |
| `RETURNS` | `RETURN_ITEMS` |
| `SUPPLIER_PO` | `SUPPLIER_PO_ITEMS` |
| `SUPPLIER_PO_ITEMS` | `STOCK_BATCHES` |

## Key implementation notes

- The physical schema uses Oracle `DATE` for both calendar dates and date-time values; it does not use `TIMESTAMP` in these table definitions.
- Primary-key sequences start at 1 except `SEQ_ORDER` (1000) and `SEQ_SPO` (5000).
- Only `SETUP_ITEMS` and `CART_ITEMS` declare `ON DELETE CASCADE`.
- Product subtype one-to-one behavior is enforced by a unique `PRODUCT_ID` in `TANKS`, `FISH`, `PLANTS`, `EQUIPMENT`, and `DECORATIONS`.
- `CUSTOMERS.PASSWORD_HASH` is applied after the core schema by `05_auth_migration.sql`.
- Several business defaults are nullable at the database level because the columns have a `DEFAULT` but no explicit `NOT NULL`; the Nullable column above reflects the physical DDL exactly.
