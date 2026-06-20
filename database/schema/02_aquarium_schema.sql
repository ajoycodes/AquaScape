-- ============================================================
-- MODULE 3: AQUARIUM BUILDER SCHEMA
-- Run as AQUASCAPE user — depends on 01_core_schema.sql
-- ============================================================

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE seq_setup         START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_setup_item    START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_compat_rule   START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_saved_setup   START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_wishlist      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_cart          START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_cart_item     START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;

-- ============================================================
-- TABLE: AQUARIUM_SETUPS
-- A customer's named aquarium design / build
-- ============================================================
CREATE TABLE aquarium_setups (
    setup_id        NUMBER          DEFAULT seq_setup.NEXTVAL    NOT NULL,
    customer_id     NUMBER          NOT NULL,
    tank_id         NUMBER          NOT NULL,
    setup_name      VARCHAR2(150)   NOT NULL,
    water_type      VARCHAR2(20)    NOT NULL,
    target_temp_c   NUMBER(5,2),
    target_ph       NUMBER(4,2),
    description     VARCHAR2(500),
    status          VARCHAR2(20)    DEFAULT 'DRAFT',
    created_at      DATE            DEFAULT SYSDATE,
    updated_at      DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_aquarium_setups       PRIMARY KEY (setup_id),
    CONSTRAINT fk_setup_customer        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_setup_tank            FOREIGN KEY (tank_id)     REFERENCES tanks(tank_id),
    CONSTRAINT chk_setup_status         CHECK (status     IN ('DRAFT','SAVED','ORDERED','ARCHIVED')),
    CONSTRAINT chk_setup_water          CHECK (water_type IN ('FRESHWATER','SALTWATER','BRACKISH')),
    CONSTRAINT chk_setup_temp           CHECK (target_temp_c IS NULL OR (target_temp_c >= 0 AND target_temp_c <= 40)),
    CONSTRAINT chk_setup_ph             CHECK (target_ph     IS NULL OR (target_ph     >= 0 AND target_ph     <= 14))
);

COMMENT ON TABLE  aquarium_setups         IS 'Customer-designed aquarium configurations';
COMMENT ON COLUMN aquarium_setups.status  IS 'DRAFT = in progress | SAVED = finalized | ORDERED = purchased | ARCHIVED = old';

-- ============================================================
-- TABLE: SETUP_ITEMS
-- Individual items (fish/plant/equip/deco) within a setup
-- ============================================================
CREATE TABLE setup_items (
    setup_item_id   NUMBER          DEFAULT seq_setup_item.NEXTVAL NOT NULL,
    setup_id        NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    item_type       VARCHAR2(20)    NOT NULL,
    quantity        NUMBER          DEFAULT 1,
    notes           VARCHAR2(500),
    added_at        DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_setup_items           PRIMARY KEY (setup_item_id),
    CONSTRAINT fk_si_setup              FOREIGN KEY (setup_id)   REFERENCES aquarium_setups(setup_id) ON DELETE CASCADE,
    CONSTRAINT fk_si_product            FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_si_product_in_setup   UNIQUE      (setup_id, product_id),
    CONSTRAINT chk_si_type              CHECK (item_type IN ('FISH','PLANT','EQUIPMENT','DECORATION')),
    CONSTRAINT chk_si_qty               CHECK (quantity > 0)
);

COMMENT ON TABLE  setup_items              IS 'Items added to an aquarium setup design';
COMMENT ON COLUMN setup_items.item_type    IS 'Mirrors product_type — FISH | PLANT | EQUIPMENT | DECORATION';

-- ============================================================
-- TABLE: COMPATIBILITY_RULES
-- Admin-defined rules for what can/cannot coexist
-- ============================================================
CREATE TABLE compatibility_rules (
    rule_id         NUMBER          DEFAULT seq_compat_rule.NEXTVAL NOT NULL,
    product_id_a    NUMBER          NOT NULL,
    product_id_b    NUMBER          NOT NULL,
    rule_type       VARCHAR2(20)    NOT NULL,
    reason          VARCHAR2(500),
    severity        VARCHAR2(10)    DEFAULT 'WARNING',
    created_by      NUMBER,
    created_at      DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_compat_rules          PRIMARY KEY (rule_id),
    CONSTRAINT fk_rule_product_a        FOREIGN KEY (product_id_a)  REFERENCES products(product_id),
    CONSTRAINT fk_rule_product_b        FOREIGN KEY (product_id_b)  REFERENCES products(product_id),
    CONSTRAINT fk_rule_created_by       FOREIGN KEY (created_by)    REFERENCES users(user_id),
    CONSTRAINT uq_rule_pair             UNIQUE      (product_id_a, product_id_b),
    CONSTRAINT chk_rule_type            CHECK (rule_type IN ('INCOMPATIBLE','REQUIRES','NEUTRAL')),
    CONSTRAINT chk_rule_severity        CHECK (severity  IN ('WARNING','ERROR')),
    CONSTRAINT chk_rule_no_self         CHECK (product_id_a <> product_id_b)
);

COMMENT ON TABLE  compatibility_rules           IS 'Admin-defined rules for item coexistence in a setup';
COMMENT ON COLUMN compatibility_rules.rule_type IS 'INCOMPATIBLE = cannot coexist | REQUIRES = must accompany | NEUTRAL = documented but allowed';
COMMENT ON COLUMN compatibility_rules.severity  IS 'ERROR = blocks add | WARNING = alert only';

-- ============================================================
-- TABLE: SAVED_SETUPS
-- Published / shareable snapshots of a completed design
-- ============================================================
CREATE TABLE saved_setups (
    saved_id        NUMBER          DEFAULT seq_saved_setup.NEXTVAL NOT NULL,
    setup_id        NUMBER          NOT NULL,
    customer_id     NUMBER          NOT NULL,
    share_code      VARCHAR2(20),
    is_public       NUMBER(1)       DEFAULT 0,
    saved_at        DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_saved_setups          PRIMARY KEY (saved_id),
    CONSTRAINT fk_ss_setup              FOREIGN KEY (setup_id)    REFERENCES aquarium_setups(setup_id),
    CONSTRAINT fk_ss_customer           FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT uq_ss_setup              UNIQUE      (setup_id),
    CONSTRAINT uq_ss_share_code         UNIQUE      (share_code),
    CONSTRAINT chk_ss_public            CHECK (is_public IN (0, 1))
);

COMMENT ON TABLE saved_setups IS 'Public / shareable snapshots of finalized setups';

-- ============================================================
-- TABLE: WISHLIST
-- Products a customer wants but has not yet added to cart
-- ============================================================
CREATE TABLE wishlist (
    wishlist_id     NUMBER          DEFAULT seq_wishlist.NEXTVAL   NOT NULL,
    customer_id     NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    added_at        DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_wishlist              PRIMARY KEY (wishlist_id),
    CONSTRAINT fk_wl_customer           FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_wl_product            FOREIGN KEY (product_id)  REFERENCES products(product_id),
    CONSTRAINT uq_wl_customer_product   UNIQUE      (customer_id, product_id)
);

COMMENT ON TABLE wishlist IS 'Per-customer product wishlist — one entry per product';

-- ============================================================
-- TABLE: CART
-- Active shopping cart — one per customer
-- ============================================================
CREATE TABLE cart (
    cart_id         NUMBER          DEFAULT seq_cart.NEXTVAL        NOT NULL,
    customer_id     NUMBER          NOT NULL,
    created_at      DATE            DEFAULT SYSDATE,
    updated_at      DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_cart                  PRIMARY KEY (cart_id),
    CONSTRAINT fk_cart_customer         FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT uq_cart_per_customer     UNIQUE      (customer_id)
);

COMMENT ON TABLE cart IS 'Active cart — enforced one per customer via UNIQUE constraint';

-- ============================================================
-- TABLE: CART_ITEMS
-- Line items inside a customer's cart
-- ============================================================
CREATE TABLE cart_items (
    cart_item_id    NUMBER          DEFAULT seq_cart_item.NEXTVAL   NOT NULL,
    cart_id         NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    quantity        NUMBER          DEFAULT 1,
    added_at        DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_cart_items            PRIMARY KEY (cart_item_id),
    CONSTRAINT fk_ci_cart               FOREIGN KEY (cart_id)    REFERENCES cart(cart_id)     ON DELETE CASCADE,
    CONSTRAINT fk_ci_product            FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_ci_product_in_cart    UNIQUE      (cart_id, product_id),
    CONSTRAINT chk_ci_qty               CHECK (quantity > 0)
);

COMMENT ON TABLE cart_items IS 'Line items in a customers cart — cascades delete when cart is cleared';

-- ============================================================
-- VERIFY CREATION
-- ============================================================
SELECT table_name FROM user_tables
WHERE table_name IN (
    'AQUARIUM_SETUPS','SETUP_ITEMS','COMPATIBILITY_RULES',
    'SAVED_SETUPS','WISHLIST','CART','CART_ITEMS'
)
ORDER BY table_name;

PROMPT MODULE 3 — Aquarium builder schema created successfully.
