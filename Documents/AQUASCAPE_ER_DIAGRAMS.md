# AquaScape Entity-Relationship Diagrams

This document contains the complete graphical entity-relationship models for the AquaScape Oracle Database, mapped to the 32 physical tables defined in `database/schema/01_core_schema.sql` through `04_supplier_schema.sql`, plus the customer authentication column added by `05_auth_migration.sql`.

The schema is divided into four logical modules for readability.

---

## 1. Core Identity, Catalogue & Inventory

Handles staff access, customers, suppliers, product classification, inventory, and type-specific aquarium product details.

```mermaid
erDiagram
    ROLES {
        NUMBER role_id PK
        VARCHAR2 role_name UK
        VARCHAR2 description
        DATE created_at
    }
    USERS {
        NUMBER user_id PK
        NUMBER role_id FK
        VARCHAR2 username UK
        VARCHAR2 email UK
        VARCHAR2 password_hash
        NUMBER is_active
        DATE last_login
        DATE created_at
    }
    CUSTOMERS {
        NUMBER customer_id PK
        VARCHAR2 first_name
        VARCHAR2 last_name
        VARCHAR2 email UK
        VARCHAR2 phone
        VARCHAR2 address
        VARCHAR2 city
        VARCHAR2 country
        NUMBER is_active
        DATE created_at
        VARCHAR2 password_hash
    }
    SUPPLIERS {
        NUMBER supplier_id PK
        VARCHAR2 supplier_name
        VARCHAR2 contact_name
        VARCHAR2 email UK
        VARCHAR2 phone
        VARCHAR2 address
        VARCHAR2 city
        VARCHAR2 country
        VARCHAR2 payment_terms
        NUMBER is_active
        DATE created_at
    }
    CATEGORIES {
        NUMBER category_id PK
        VARCHAR2 category_name UK
        NUMBER parent_id FK
        VARCHAR2 description
        NUMBER sort_order
    }
    PRODUCTS {
        NUMBER product_id PK
        NUMBER category_id FK
        VARCHAR2 product_name
        VARCHAR2 product_type
        VARCHAR2 sku UK
        NUMBER unit_price
        NUMBER cost_price
        VARCHAR2 description
        VARCHAR2 image_url
        NUMBER is_active
        DATE created_at
        DATE updated_at
    }
    INVENTORY {
        NUMBER inventory_id PK
        NUMBER product_id FK,UK
        NUMBER qty_on_hand
        NUMBER qty_reserved
        NUMBER reorder_level
        NUMBER reorder_qty
        DATE last_updated
    }
    TANKS {
        NUMBER tank_id PK
        NUMBER product_id FK,UK
        NUMBER volume_liters
        NUMBER length_cm
        NUMBER width_cm
        NUMBER height_cm
        VARCHAR2 material
        VARCHAR2 shape
        NUMBER has_hood
    }
    FISH {
        NUMBER fish_id PK
        NUMBER product_id FK,UK
        VARCHAR2 species
        VARCHAR2 common_name
        VARCHAR2 water_type
        NUMBER min_temp_c
        NUMBER max_temp_c
        NUMBER min_ph
        NUMBER max_ph
        NUMBER min_tank_liters
        NUMBER max_fish_per_liter
        NUMBER is_aggressive
        VARCHAR2 care_level
        VARCHAR2 origin_region
        NUMBER lifespan_years
    }
    PLANTS {
        NUMBER plant_id PK
        NUMBER product_id FK,UK
        VARCHAR2 species
        VARCHAR2 common_name
        VARCHAR2 water_type
        NUMBER min_temp_c
        NUMBER max_temp_c
        VARCHAR2 light_requirement
        NUMBER co2_required
        VARCHAR2 growth_rate
        VARCHAR2 placement
    }
    EQUIPMENT {
        NUMBER equipment_id PK
        NUMBER product_id FK,UK
        VARCHAR2 equipment_type
        NUMBER power_watts
        NUMBER suitable_liters_min
        NUMBER suitable_liters_max
        VARCHAR2 voltage
        VARCHAR2 brand
        VARCHAR2 model_number
    }
    DECORATIONS {
        NUMBER decoration_id PK
        NUMBER product_id FK,UK
        VARCHAR2 deco_type
        VARCHAR2 material
        NUMBER is_natural
        VARCHAR2 safe_water_type
        VARCHAR2 size_class
    }

    ROLES ||--o{ USERS : "assigns"
    CATEGORIES o|--o{ CATEGORIES : "contains subcategories"
    CATEGORIES ||--o{ PRODUCTS : "classifies"
    PRODUCTS ||--o| INVENTORY : "stocked as"
    PRODUCTS ||--o| TANKS : "detailed as"
    PRODUCTS ||--o| FISH : "detailed as"
    PRODUCTS ||--o| PLANTS : "detailed as"
    PRODUCTS ||--o| EQUIPMENT : "detailed as"
    PRODUCTS ||--o| DECORATIONS : "detailed as"
```

---

## 2. Aquarium Builder, Wishlist & Cart

Supports customer aquarium designs, item compatibility, saved configurations, wishlists, and active shopping carts.

```mermaid
erDiagram
    AQUARIUM_SETUPS {
        NUMBER setup_id PK
        NUMBER customer_id FK
        NUMBER tank_id FK
        VARCHAR2 setup_name
        VARCHAR2 water_type
        NUMBER target_temp_c
        NUMBER target_ph
        VARCHAR2 description
        VARCHAR2 status
        DATE created_at
        DATE updated_at
    }
    SETUP_ITEMS {
        NUMBER setup_item_id PK
        NUMBER setup_id FK
        NUMBER product_id FK
        VARCHAR2 item_type
        NUMBER quantity
        VARCHAR2 notes
        DATE added_at
    }
    COMPATIBILITY_RULES {
        NUMBER rule_id PK
        NUMBER product_id_a FK
        NUMBER product_id_b FK
        VARCHAR2 rule_type
        VARCHAR2 reason
        VARCHAR2 severity
        NUMBER created_by FK
        DATE created_at
    }
    SAVED_SETUPS {
        NUMBER saved_id PK
        NUMBER setup_id FK,UK
        NUMBER customer_id FK
        VARCHAR2 share_code UK
        NUMBER is_public
        DATE saved_at
    }
    WISHLIST {
        NUMBER wishlist_id PK
        NUMBER customer_id FK
        NUMBER product_id FK
        DATE added_at
    }
    CART {
        NUMBER cart_id PK
        NUMBER customer_id FK,UK
        DATE created_at
        DATE updated_at
    }
    CART_ITEMS {
        NUMBER cart_item_id PK
        NUMBER cart_id FK
        NUMBER product_id FK
        NUMBER quantity
        DATE added_at
    }
    CUSTOMERS {
        NUMBER customer_id PK
    }
    USERS {
        NUMBER user_id PK
    }
    PRODUCTS {
        NUMBER product_id PK
    }
    TANKS {
        NUMBER tank_id PK
    }

    CUSTOMERS ||--o{ AQUARIUM_SETUPS : "designs"
    TANKS ||--o{ AQUARIUM_SETUPS : "used by"
    AQUARIUM_SETUPS ||--o{ SETUP_ITEMS : "contains"
    PRODUCTS ||--o{ SETUP_ITEMS : "added to"
    PRODUCTS ||--o{ COMPATIBILITY_RULES : "product A"
    PRODUCTS ||--o{ COMPATIBILITY_RULES : "product B"
    USERS o|--o{ COMPATIBILITY_RULES : "defines"
    AQUARIUM_SETUPS ||--o| SAVED_SETUPS : "published as"
    CUSTOMERS ||--o{ SAVED_SETUPS : "saves"
    CUSTOMERS ||--o{ WISHLIST : "maintains"
    PRODUCTS ||--o{ WISHLIST : "wished for"
    CUSTOMERS ||--o| CART : "owns"
    CART ||--o{ CART_ITEMS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "added as"
```

---

## 3. Sales Orders, Discounts, Payments & Returns

Tracks customer purchases, aquarium-builder orders, applied promotions, payment attempts, and product returns.

```mermaid
erDiagram
    DISCOUNTS {
        NUMBER discount_id PK
        VARCHAR2 code UK
        VARCHAR2 discount_type
        NUMBER value
        NUMBER min_order_amt
        NUMBER max_uses
        NUMBER used_count
        DATE valid_from
        DATE valid_until
        NUMBER is_active
        DATE created_at
    }
    ORDERS {
        NUMBER order_id PK
        NUMBER customer_id FK
        NUMBER setup_id FK
        DATE order_date
        VARCHAR2 order_status
        NUMBER subtotal
        NUMBER discount_total
        NUMBER tax_amount
        NUMBER total_amount
        VARCHAR2 shipping_addr
        VARCHAR2 notes
    }
    ORDER_ITEMS {
        NUMBER order_item_id PK
        NUMBER order_id FK
        NUMBER product_id FK
        NUMBER quantity
        NUMBER unit_price
        NUMBER line_total
    }
    ORDER_DISCOUNTS {
        NUMBER order_id PK,FK
        NUMBER discount_id PK,FK
        NUMBER applied_amt
        DATE applied_at
    }
    PAYMENTS {
        NUMBER payment_id PK
        NUMBER order_id FK
        DATE payment_date
        NUMBER amount
        VARCHAR2 payment_method
        VARCHAR2 payment_status
        VARCHAR2 transaction_ref
        VARCHAR2 notes
    }
    RETURNS {
        NUMBER return_id PK
        NUMBER order_id FK
        NUMBER customer_id FK
        DATE return_date
        VARCHAR2 reason
        VARCHAR2 return_status
        NUMBER refund_amount
        NUMBER processed_by FK
        DATE processed_at
    }
    RETURN_ITEMS {
        NUMBER return_item_id PK
        NUMBER return_id FK
        NUMBER order_item_id FK
        NUMBER quantity
        VARCHAR2 condition_code
    }
    CUSTOMERS {
        NUMBER customer_id PK
    }
    AQUARIUM_SETUPS {
        NUMBER setup_id PK
    }
    PRODUCTS {
        NUMBER product_id PK
    }
    USERS {
        NUMBER user_id PK
    }

    CUSTOMERS ||--o{ ORDERS : "places"
    AQUARIUM_SETUPS o|--o{ ORDERS : "ordered through"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "sold as"
    ORDERS ||--o{ ORDER_DISCOUNTS : "receives"
    DISCOUNTS ||--o{ ORDER_DISCOUNTS : "applied through"
    ORDERS ||--o{ PAYMENTS : "paid via"
    ORDERS ||--o{ RETURNS : "may generate"
    CUSTOMERS ||--o{ RETURNS : "requests"
    USERS o|--o{ RETURNS : "processes"
    RETURNS ||--o{ RETURN_ITEMS : "contains"
    ORDER_ITEMS ||--o{ RETURN_ITEMS : "returned as"
```

---

## 4. Supplier Procurement, Stock Control & Auditing

Manages supplier purchase orders, received batches, low-stock alerts, the inventory movement ledger, and database audit history.

```mermaid
erDiagram
    SUPPLIER_PO {
        NUMBER po_id PK
        NUMBER supplier_id FK
        NUMBER created_by FK
        DATE po_date
        DATE expected_date
        DATE received_date
        VARCHAR2 po_status
        NUMBER total_amount
        VARCHAR2 notes
    }
    SUPPLIER_PO_ITEMS {
        NUMBER po_item_id PK
        NUMBER po_id FK
        NUMBER product_id FK
        NUMBER quantity_ord
        NUMBER quantity_recv
        NUMBER unit_cost
        NUMBER line_total
    }
    STOCK_BATCHES {
        NUMBER batch_id PK
        NUMBER po_item_id FK
        NUMBER product_id FK
        NUMBER quantity
        DATE received_date
        DATE expiry_date
        VARCHAR2 batch_notes
    }
    LOW_STOCK_ALERTS {
        NUMBER alert_id PK
        NUMBER product_id FK
        DATE alert_date
        NUMBER qty_at_alert
        NUMBER reorder_level
        NUMBER is_resolved
        DATE resolved_at
        NUMBER resolved_by FK
    }
    INVENTORY_MOVEMENTS {
        NUMBER movement_id PK
        NUMBER product_id FK
        VARCHAR2 movement_type
        NUMBER quantity_delta
        NUMBER qty_after
        NUMBER reference_id
        VARCHAR2 reference_type
        DATE moved_at
        NUMBER performed_by FK
        VARCHAR2 notes
    }
    AUDIT_LOG {
        NUMBER audit_id PK
        VARCHAR2 table_name
        VARCHAR2 operation
        NUMBER record_id
        VARCHAR2 changed_by
        DATE changed_at
        VARCHAR2 old_values
        VARCHAR2 new_values
    }
    SUPPLIERS {
        NUMBER supplier_id PK
    }
    USERS {
        NUMBER user_id PK
    }
    PRODUCTS {
        NUMBER product_id PK
    }

    SUPPLIERS ||--o{ SUPPLIER_PO : "receives"
    USERS ||--o{ SUPPLIER_PO : "creates"
    SUPPLIER_PO ||--o{ SUPPLIER_PO_ITEMS : "contains"
    PRODUCTS ||--o{ SUPPLIER_PO_ITEMS : "procured as"
    SUPPLIER_PO_ITEMS ||--o{ STOCK_BATCHES : "received in"
    PRODUCTS ||--o{ STOCK_BATCHES : "stocked by"
    PRODUCTS ||--o{ LOW_STOCK_ALERTS : "triggers"
    USERS o|--o{ LOW_STOCK_ALERTS : "resolves"
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "has movements"
    USERS o|--o{ INVENTORY_MOVEMENTS : "performs"
```

---

## Relationship notation

| Symbol | Meaning |
|---|---|
| `||` | Exactly one |
| `o|` | Zero or one |
| `o{` | Zero or many |
| `PK` | Primary key |
| `FK` | Foreign key |
| `UK` | Unique key |

The diagrams reflect physical foreign keys. `AUDIT_LOG` is intentionally independent: its target table and row are recorded generically through `TABLE_NAME` and `RECORD_ID`, not through database foreign keys.
