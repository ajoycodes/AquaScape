-- ============================================================
-- MODULE 5: SUPPLIER & INVENTORY FLOW SCHEMA
-- Run as AQUASCAPE user — depends on 01_core_schema.sql
-- ============================================================

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE seq_spo         START WITH 5000 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_spo_item    START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_batch       START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_alert       START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_inv_move    START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;

-- ============================================================
-- TABLE: SUPPLIER_PO
-- Purchase order header sent to a supplier
-- ============================================================
CREATE TABLE supplier_po (
    po_id           NUMBER          DEFAULT seq_spo.NEXTVAL     NOT NULL,
    supplier_id     NUMBER          NOT NULL,
    created_by      NUMBER          NOT NULL,
    po_date         DATE            DEFAULT SYSDATE,
    expected_date   DATE,
    received_date   DATE,
    po_status       VARCHAR2(20)    DEFAULT 'DRAFT',
    total_amount    NUMBER(12,2)    DEFAULT 0,
    notes           VARCHAR2(1000),
    -- Constraints
    CONSTRAINT pk_supplier_po           PRIMARY KEY (po_id),
    CONSTRAINT fk_spo_supplier          FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_spo_created_by        FOREIGN KEY (created_by)  REFERENCES users(user_id),
    CONSTRAINT chk_spo_status           CHECK (po_status IN (
        'DRAFT','SUBMITTED','APPROVED','SHIPPED','RECEIVED','CANCELLED'
    )),
    CONSTRAINT chk_spo_total            CHECK (total_amount >= 0),
    CONSTRAINT chk_spo_dates            CHECK (
        expected_date IS NULL OR received_date IS NULL OR received_date >= po_date
    )
);

COMMENT ON TABLE  supplier_po           IS 'Purchase order header — from AquaScape to supplier';
COMMENT ON COLUMN supplier_po.po_status IS 'DRAFT → SUBMITTED → APPROVED → SHIPPED → RECEIVED';
COMMENT ON COLUMN supplier_po.po_id     IS 'Starts at 5000 to distinguish from order IDs visually';

-- ============================================================
-- TABLE: SUPPLIER_PO_ITEMS
-- Line items on a purchase order
-- ============================================================
CREATE TABLE supplier_po_items (
    po_item_id      NUMBER          DEFAULT seq_spo_item.NEXTVAL NOT NULL,
    po_id           NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    quantity_ord    NUMBER          NOT NULL,
    quantity_recv   NUMBER          DEFAULT 0,
    unit_cost       NUMBER(10,2)    NOT NULL,
    line_total      NUMBER(12,2)    NOT NULL,
    -- Constraints
    CONSTRAINT pk_supplier_po_items     PRIMARY KEY (po_item_id),
    CONSTRAINT fk_spoi_po               FOREIGN KEY (po_id)       REFERENCES supplier_po(po_id),
    CONSTRAINT fk_spoi_product          FOREIGN KEY (product_id)  REFERENCES products(product_id),
    CONSTRAINT uq_spoi_product_per_po   UNIQUE      (po_id, product_id),
    CONSTRAINT chk_spoi_qty_ord         CHECK (quantity_ord  > 0),
    CONSTRAINT chk_spoi_qty_recv        CHECK (quantity_recv >= 0),
    CONSTRAINT chk_spoi_unit_cost       CHECK (unit_cost    >= 0),
    CONSTRAINT chk_spoi_line_total      CHECK (line_total   >= 0),
    CONSTRAINT chk_spoi_recv_le_ord     CHECK (quantity_recv <= quantity_ord)
);

COMMENT ON TABLE  supplier_po_items              IS 'Line items on a supplier purchase order';
COMMENT ON COLUMN supplier_po_items.quantity_recv IS 'Filled by receive_supplier_po procedure — tracks partial deliveries';

-- ============================================================
-- TABLE: STOCK_BATCHES
-- Individual received stock batch records for traceability
-- ============================================================
CREATE TABLE stock_batches (
    batch_id        NUMBER          DEFAULT seq_batch.NEXTVAL    NOT NULL,
    po_item_id      NUMBER          NOT NULL,
    product_id      NUMBER          NOT NULL,
    quantity        NUMBER          NOT NULL,
    received_date   DATE            DEFAULT SYSDATE,
    expiry_date     DATE,
    batch_notes     VARCHAR2(500),
    -- Constraints
    CONSTRAINT pk_stock_batches         PRIMARY KEY (batch_id),
    CONSTRAINT fk_batch_po_item         FOREIGN KEY (po_item_id)  REFERENCES supplier_po_items(po_item_id),
    CONSTRAINT fk_batch_product         FOREIGN KEY (product_id)  REFERENCES products(product_id),
    CONSTRAINT chk_batch_qty            CHECK (quantity > 0),
    CONSTRAINT chk_batch_expiry         CHECK (expiry_date IS NULL OR expiry_date >= received_date)
);

COMMENT ON TABLE stock_batches IS 'Per-batch traceability of received stock — links to PO line item';

-- ============================================================
-- TABLE: LOW_STOCK_ALERTS
-- Auto-generated when qty_on_hand falls to reorder_level
-- Populated by trigger trg_low_stock_alert
-- ============================================================
CREATE TABLE low_stock_alerts (
    alert_id        NUMBER          DEFAULT seq_alert.NEXTVAL    NOT NULL,
    product_id      NUMBER          NOT NULL,
    alert_date      DATE            DEFAULT SYSDATE,
    qty_at_alert    NUMBER          NOT NULL,
    reorder_level   NUMBER          NOT NULL,
    is_resolved     NUMBER(1)       DEFAULT 0,
    resolved_at     DATE,
    resolved_by     NUMBER,
    -- Constraints
    CONSTRAINT pk_low_stock_alerts      PRIMARY KEY (alert_id),
    CONSTRAINT fk_alert_product         FOREIGN KEY (product_id)   REFERENCES products(product_id),
    CONSTRAINT fk_alert_resolved_by     FOREIGN KEY (resolved_by)  REFERENCES users(user_id),
    CONSTRAINT chk_alert_qty            CHECK (qty_at_alert  >= 0),
    CONSTRAINT chk_alert_reorder        CHECK (reorder_level >= 0),
    CONSTRAINT chk_alert_resolved       CHECK (is_resolved   IN (0, 1))
);

COMMENT ON TABLE  low_stock_alerts            IS 'Auto-generated by trigger when stock hits reorder level';
COMMENT ON COLUMN low_stock_alerts.is_resolved IS '0 = open alert | 1 = resolved after restock';

-- ============================================================
-- TABLE: INVENTORY_MOVEMENTS
-- Full ledger of every stock change — positive = in, negative = out
-- ============================================================
CREATE TABLE inventory_movements (
    movement_id     NUMBER          DEFAULT seq_inv_move.NEXTVAL NOT NULL,
    product_id      NUMBER          NOT NULL,
    movement_type   VARCHAR2(20)    NOT NULL,
    quantity_delta  NUMBER          NOT NULL,
    qty_after       NUMBER,
    reference_id    NUMBER,
    reference_type  VARCHAR2(20),
    moved_at        DATE            DEFAULT SYSDATE,
    performed_by    NUMBER,
    notes           VARCHAR2(500),
    -- Constraints
    CONSTRAINT pk_inventory_movements   PRIMARY KEY (movement_id),
    CONSTRAINT fk_im_product            FOREIGN KEY (product_id)    REFERENCES products(product_id),
    CONSTRAINT fk_im_performed_by       FOREIGN KEY (performed_by)  REFERENCES users(user_id),
    CONSTRAINT chk_im_type              CHECK (movement_type IN (
        'SALE','PURCHASE','RETURN','ADJUSTMENT','DAMAGE','RESERVED','UNRESERVED'
    )),
    CONSTRAINT chk_im_ref_type          CHECK (reference_type IN (
        'ORDER','PO','RETURN','ADJUSTMENT','SETUP'
    ) OR reference_type IS NULL)
);

COMMENT ON TABLE  inventory_movements               IS 'Immutable ledger of every inventory change — never update/delete';
COMMENT ON COLUMN inventory_movements.quantity_delta IS 'Positive = stock in | Negative = stock out';
COMMENT ON COLUMN inventory_movements.qty_after      IS 'Snapshot of qty_on_hand after movement — for point-in-time queries';
COMMENT ON COLUMN inventory_movements.reference_type IS 'ORDER | PO | RETURN | ADJUSTMENT — identifies source record';

-- ============================================================
-- TABLE: AUDIT_LOG
-- Generic DML audit table — populated by triggers
-- ============================================================
CREATE TABLE audit_log (
    audit_id        NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name      VARCHAR2(50)    NOT NULL,
    operation       VARCHAR2(10)    NOT NULL,
    record_id       NUMBER,
    changed_by      VARCHAR2(60)    DEFAULT SYS_CONTEXT('USERENV','SESSION_USER'),
    changed_at      DATE            DEFAULT SYSDATE,
    old_values      VARCHAR2(4000),
    new_values      VARCHAR2(4000),
    -- Constraints
    CONSTRAINT chk_audit_operation CHECK (operation IN ('INSERT','UPDATE','DELETE'))
);

COMMENT ON TABLE  audit_log           IS 'Generic DML audit trail populated by trg_audit_* triggers';
COMMENT ON COLUMN audit_log.audit_id  IS 'Uses IDENTITY column (Oracle 12c+) instead of sequence';
COMMENT ON COLUMN audit_log.operation IS 'INSERT | UPDATE | DELETE';

-- ============================================================
-- VERIFY CREATION
-- ============================================================
SELECT table_name FROM user_tables
WHERE table_name IN (
    'SUPPLIER_PO','SUPPLIER_PO_ITEMS','STOCK_BATCHES',
    'LOW_STOCK_ALERTS','INVENTORY_MOVEMENTS','AUDIT_LOG'
)
ORDER BY table_name;

PROMPT MODULE 5 — Supplier and inventory schema created successfully.
