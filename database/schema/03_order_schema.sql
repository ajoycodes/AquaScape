-- ============================================================
-- MODULE 4: ORDER & PAYMENT SYSTEM SCHEMA
-- Run as AQUASCAPE user — depends on 01_core_schema.sql
--                          and 02_aquarium_schema.sql
-- ============================================================

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE seq_discount      START WITH 1    INCREMENT BY 1  NOCACHE NOCYCLE;
CREATE SEQUENCE seq_order         START WITH 1000 INCREMENT BY 1  NOCACHE NOCYCLE;
CREATE SEQUENCE seq_order_item    START WITH 1    INCREMENT BY 1  NOCACHE NOCYCLE;
CREATE SEQUENCE seq_payment       START WITH 1    INCREMENT BY 1  NOCACHE NOCYCLE;
CREATE SEQUENCE seq_return        START WITH 1    INCREMENT BY 1  NOCACHE NOCYCLE;
CREATE SEQUENCE seq_return_item   START WITH 1    INCREMENT BY 1  NOCACHE NOCYCLE;

-- ============================================================
-- TABLE: DISCOUNTS
-- Promotional / coupon codes
-- ============================================================
CREATE TABLE discounts (
    discount_id     NUMBER          DEFAULT seq_discount.NEXTVAL  NOT NULL,
    code            VARCHAR2(50)    NOT NULL,
    discount_type   VARCHAR2(10)    NOT NULL,
    value           NUMBER(10,2)    NOT NULL,
    min_order_amt   NUMBER(10,2)    DEFAULT 0,
    max_uses        NUMBER,
    used_count      NUMBER          DEFAULT 0,
    valid_from      DATE,
    valid_until     DATE,
    is_active       NUMBER(1)       DEFAULT 1,
    created_at      DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_discounts             PRIMARY KEY (discount_id),
    CONSTRAINT uq_discount_code         UNIQUE      (code),
    CONSTRAINT chk_disc_type            CHECK (discount_type IN ('PERCENT','FIXED')),
    CONSTRAINT chk_disc_value           CHECK (value > 0),
    CONSTRAINT chk_disc_percent_cap     CHECK (discount_type <> 'PERCENT' OR value <= 100),
    CONSTRAINT chk_disc_min_order       CHECK (min_order_amt >= 0),
    CONSTRAINT chk_disc_used_count      CHECK (used_count >= 0),
    CONSTRAINT chk_disc_active          CHECK (is_active IN (0, 1)),
    CONSTRAINT chk_disc_date_range      CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until)
);

COMMENT ON TABLE  discounts               IS 'Promotional discount codes — percent or fixed amount off';
COMMENT ON COLUMN discounts.discount_type IS 'PERCENT = percentage off | FIXED = fixed amount off';
COMMENT ON COLUMN discounts.max_uses      IS 'NULL = unlimited uses';

-- ============================================================
-- TABLE: ORDERS
-- Order header — one record per customer transaction
-- ============================================================
CREATE TABLE orders (
    order_id        NUMBER          DEFAULT seq_order.NEXTVAL   NOT NULL,
    customer_id     NUMBER          NOT NULL,
    setup_id        NUMBER,
    order_date      DATE            DEFAULT SYSDATE,
    order_status    VARCHAR2(20)    DEFAULT 'PENDING',
    subtotal        NUMBER(12,2)    DEFAULT 0,
    discount_total  NUMBER(12,2)    DEFAULT 0,
    tax_amount      NUMBER(12,2)    DEFAULT 0,
    total_amount    NUMBER(12,2)    DEFAULT 0,
    shipping_addr   VARCHAR2(500),
    notes           VARCHAR2(1000),
    -- Constraints
    CONSTRAINT pk_orders                PRIMARY KEY (order_id),
    CONSTRAINT fk_order_customer        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_order_setup           FOREIGN KEY (setup_id)    REFERENCES aquarium_setups(setup_id),
    CONSTRAINT chk_order_status         CHECK (order_status IN (
        'PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'
    )),
    CONSTRAINT chk_order_subtotal       CHECK (subtotal        >= 0),
    CONSTRAINT chk_order_disc_total     CHECK (discount_total  >= 0),
    CONSTRAINT chk_order_tax            CHECK (tax_amount      >= 0),
    CONSTRAINT chk_order_total          CHECK (total_amount    >= 0)
);

COMMENT ON TABLE  orders              IS 'Order header — links customer, optional setup, and line items';
COMMENT ON COLUMN orders.setup_id     IS 'Optional — set when order originates from aquarium builder';
COMMENT ON COLUMN orders.order_status IS 'State machine: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED';
COMMENT ON COLUMN orders.subtotal     IS 'Sum of line totals before discount/tax — auto-maintained by trigger';

-- ============================================================
-- TABLE: ORDER_ITEMS
-- Line items belonging to an order
-- ============================================================
CREATE TABLE order_items (
    order_item_id   NUMBER          DEFAULT seq_order_item.NEXTVAL  NOT NULL,
    order_id        NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    quantity        NUMBER          NOT NULL,
    unit_price      NUMBER(10,2)    NOT NULL,
    line_total      NUMBER(12,2)    NOT NULL,
    -- Constraints
    CONSTRAINT pk_order_items           PRIMARY KEY (order_item_id),
    CONSTRAINT fk_oi_order              FOREIGN KEY (order_id)   REFERENCES orders(order_id),
    CONSTRAINT fk_oi_product            FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_oi_product_per_order  UNIQUE      (order_id, product_id),
    CONSTRAINT chk_oi_qty               CHECK (quantity    > 0),
    CONSTRAINT chk_oi_unit_price        CHECK (unit_price >= 0),
    CONSTRAINT chk_oi_line_total        CHECK (line_total >= 0)
);

COMMENT ON TABLE  order_items             IS 'Line items per order — triggers auto-update order totals';
COMMENT ON COLUMN order_items.unit_price  IS 'Price at time of purchase — not linked live to products table';

-- ============================================================
-- TABLE: ORDER_DISCOUNTS
-- Junction table — discounts applied to orders
-- ============================================================
CREATE TABLE order_discounts (
    order_id        NUMBER          NOT NULL,
    discount_id     NUMBER          NOT NULL,
    applied_amt     NUMBER(10,2)    NOT NULL,
    applied_at      DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_order_discounts       PRIMARY KEY (order_id, discount_id),
    CONSTRAINT fk_od_order              FOREIGN KEY (order_id)    REFERENCES orders(order_id),
    CONSTRAINT fk_od_discount           FOREIGN KEY (discount_id) REFERENCES discounts(discount_id),
    CONSTRAINT chk_od_applied_amt       CHECK (applied_amt >= 0)
);

COMMENT ON TABLE order_discounts IS 'Junction: tracks which discounts were applied to which orders';

-- ============================================================
-- TABLE: PAYMENTS
-- Payment records — one or more per order
-- ============================================================
CREATE TABLE payments (
    payment_id      NUMBER          DEFAULT seq_payment.NEXTVAL   NOT NULL,
    order_id        NUMBER          NOT NULL,
    payment_date    DATE            DEFAULT SYSDATE,
    amount          NUMBER(12,2)    NOT NULL,
    payment_method  VARCHAR2(20)    NOT NULL,
    payment_status  VARCHAR2(20)    DEFAULT 'PENDING',
    transaction_ref VARCHAR2(100),
    notes           VARCHAR2(300),
    -- Constraints
    CONSTRAINT pk_payments              PRIMARY KEY (payment_id),
    CONSTRAINT fk_pay_order             FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT chk_pay_method           CHECK (payment_method IN ('CASH','CARD','BANK_TRANSFER','E_WALLET')),
    CONSTRAINT chk_pay_status           CHECK (payment_status IN ('PENDING','COMPLETED','FAILED','REFUNDED')),
    CONSTRAINT chk_pay_amount           CHECK (amount > 0)
);

COMMENT ON TABLE  payments                IS 'Payment records — separate from order status for flexibility';
COMMENT ON COLUMN payments.payment_status IS 'PENDING | COMPLETED | FAILED | REFUNDED';

-- ============================================================
-- TABLE: RETURNS
-- Return request header
-- ============================================================
CREATE TABLE returns (
    return_id       NUMBER          DEFAULT seq_return.NEXTVAL    NOT NULL,
    order_id        NUMBER          NOT NULL,
    customer_id     NUMBER          NOT NULL,
    return_date     DATE            DEFAULT SYSDATE,
    reason          VARCHAR2(500),
    return_status   VARCHAR2(20)    DEFAULT 'REQUESTED',
    refund_amount   NUMBER(12,2),
    processed_by    NUMBER,
    processed_at    DATE,
    -- Constraints
    CONSTRAINT pk_returns               PRIMARY KEY (return_id),
    CONSTRAINT fk_ret_order             FOREIGN KEY (order_id)     REFERENCES orders(order_id),
    CONSTRAINT fk_ret_customer          FOREIGN KEY (customer_id)  REFERENCES customers(customer_id),
    CONSTRAINT fk_ret_processed_by      FOREIGN KEY (processed_by) REFERENCES users(user_id),
    CONSTRAINT chk_ret_status           CHECK (return_status IN ('REQUESTED','APPROVED','REJECTED','REFUNDED')),
    CONSTRAINT chk_ret_refund_amt       CHECK (refund_amount IS NULL OR refund_amount >= 0)
);

COMMENT ON TABLE  returns               IS 'Return request header — links order and customer';
COMMENT ON COLUMN returns.return_status IS 'REQUESTED → APPROVED/REJECTED → REFUNDED';

-- ============================================================
-- TABLE: RETURN_ITEMS
-- Individual items included in a return request
-- ============================================================
CREATE TABLE return_items (
    return_item_id  NUMBER          DEFAULT seq_return_item.NEXTVAL NOT NULL,
    return_id       NUMBER          NOT NULL,
    order_item_id   NUMBER          NOT NULL,
    quantity        NUMBER          NOT NULL,
    condition_code  VARCHAR2(15),
    -- Constraints
    CONSTRAINT pk_return_items          PRIMARY KEY (return_item_id),
    CONSTRAINT fk_ri_return             FOREIGN KEY (return_id)     REFERENCES returns(return_id),
    CONSTRAINT fk_ri_order_item         FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
    CONSTRAINT uq_ri_per_return         UNIQUE      (return_id, order_item_id),
    CONSTRAINT chk_ri_qty               CHECK (quantity > 0),
    CONSTRAINT chk_ri_condition         CHECK (condition_code IN ('GOOD','DAMAGED','DEAD','OTHER') OR condition_code IS NULL)
);

COMMENT ON TABLE  return_items                IS 'Line items within a return — condition determines restocking';
COMMENT ON COLUMN return_items.condition_code IS 'GOOD = restock | DAMAGED/DEAD = write-off';

-- ============================================================
-- VERIFY CREATION
-- ============================================================
SELECT table_name FROM user_tables
WHERE table_name IN (
    'DISCOUNTS','ORDERS','ORDER_ITEMS','ORDER_DISCOUNTS',
    'PAYMENTS','RETURNS','RETURN_ITEMS'
)
ORDER BY table_name;

PROMPT MODULE 4 — Order and payment schema created successfully.
