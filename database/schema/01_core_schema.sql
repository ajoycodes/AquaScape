-- ============================================================
-- MODULE 2: AQUASCAPE CORE DATABASE SCHEMA
-- Run as AQUASCAPE user
-- ============================================================

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE seq_role      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_user      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_customer  START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_supplier  START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_category  START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_product   START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_inventory START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tank      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_fish      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_plant     START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_equipment START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_deco      START WITH 1    INCREMENT BY 1 NOCACHE NOCYCLE;

-- ============================================================
-- TABLE: ROLES
-- System role definitions (Admin, Staff, Customer)
-- ============================================================
CREATE TABLE roles (
    role_id     NUMBER          DEFAULT seq_role.NEXTVAL   NOT NULL,
    role_name   VARCHAR2(50)    NOT NULL,
    description VARCHAR2(255),
    created_at  DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_roles         PRIMARY KEY (role_id),
    CONSTRAINT uq_role_name     UNIQUE      (role_name),
    CONSTRAINT chk_role_name    CHECK       (TRIM(role_name) IS NOT NULL)
);

COMMENT ON TABLE  roles           IS 'System role definitions for access control';
COMMENT ON COLUMN roles.role_id   IS 'Primary key — auto from seq_role';
COMMENT ON COLUMN roles.role_name IS 'Unique role label e.g. ADMIN, STAFF, CUSTOMER';

-- ============================================================
-- TABLE: USERS
-- Admin and staff accounts with role assignment
-- ============================================================
CREATE TABLE users (
    user_id       NUMBER          DEFAULT seq_user.NEXTVAL  NOT NULL,
    role_id       NUMBER          NOT NULL,
    username      VARCHAR2(50)    NOT NULL,
    email         VARCHAR2(100)   NOT NULL,
    password_hash VARCHAR2(255)   NOT NULL,
    is_active     NUMBER(1)       DEFAULT 1,
    last_login    DATE,
    created_at    DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_users           PRIMARY KEY (user_id),
    CONSTRAINT fk_user_role       FOREIGN KEY (role_id)   REFERENCES roles(role_id),
    CONSTRAINT uq_user_email      UNIQUE      (email),
    CONSTRAINT uq_username        UNIQUE      (username),
    CONSTRAINT chk_user_active    CHECK       (is_active IN (0, 1)),
    CONSTRAINT chk_user_email_fmt CHECK       (email LIKE '%@%.%')
);

COMMENT ON TABLE  users             IS 'Admin and staff accounts';
COMMENT ON COLUMN users.is_active   IS '1 = active, 0 = suspended';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password — never store plain text';

-- ============================================================
-- TABLE: CUSTOMERS
-- Registered buyers / hobbyists
-- ============================================================
CREATE TABLE customers (
    customer_id   NUMBER          DEFAULT seq_customer.NEXTVAL  NOT NULL,
    first_name    VARCHAR2(60)    NOT NULL,
    last_name     VARCHAR2(60)    NOT NULL,
    email         VARCHAR2(100)   NOT NULL,
    phone         VARCHAR2(20),
    address       VARCHAR2(500),
    city          VARCHAR2(80),
    country       VARCHAR2(60)    DEFAULT 'Malaysia',
    is_active     NUMBER(1)       DEFAULT 1,
    created_at    DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_customers          PRIMARY KEY (customer_id),
    CONSTRAINT uq_customer_email     UNIQUE      (email),
    CONSTRAINT chk_customer_email    CHECK       (email LIKE '%@%.%'),
    CONSTRAINT chk_customer_active   CHECK       (is_active IN (0, 1))
);

COMMENT ON TABLE customers IS 'Registered customer / buyer profiles';

-- ============================================================
-- TABLE: SUPPLIERS
-- Vendors who supply fish, plants, equipment
-- ============================================================
CREATE TABLE suppliers (
    supplier_id   NUMBER          DEFAULT seq_supplier.NEXTVAL  NOT NULL,
    supplier_name VARCHAR2(150)   NOT NULL,
    contact_name  VARCHAR2(100),
    email         VARCHAR2(100),
    phone         VARCHAR2(20),
    address       VARCHAR2(500),
    city          VARCHAR2(80),
    country       VARCHAR2(60),
    payment_terms VARCHAR2(100),   -- e.g. NET30, COD
    is_active     NUMBER(1)       DEFAULT 1,
    created_at    DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_suppliers         PRIMARY KEY (supplier_id),
    CONSTRAINT uq_supplier_email    UNIQUE      (email),
    CONSTRAINT chk_supplier_active  CHECK       (is_active IN (0, 1))
);

COMMENT ON TABLE suppliers IS 'Vendor / supplier profiles for procurement';

-- ============================================================
-- TABLE: CATEGORIES
-- Self-referencing taxonomy (parent → child categories)
-- ============================================================
CREATE TABLE categories (
    category_id   NUMBER          DEFAULT seq_category.NEXTVAL  NOT NULL,
    category_name VARCHAR2(100)   NOT NULL,
    parent_id     NUMBER,                         -- NULL = top-level
    description   VARCHAR2(300),
    sort_order    NUMBER          DEFAULT 0,
    -- Constraints
    CONSTRAINT pk_categories        PRIMARY KEY (category_id),
    CONSTRAINT fk_category_parent   FOREIGN KEY (parent_id) REFERENCES categories(category_id),
    CONSTRAINT uq_category_name     UNIQUE      (category_name),
    CONSTRAINT chk_cat_self         CHECK       (parent_id <> category_id)
);

COMMENT ON TABLE  categories           IS 'Self-referencing product taxonomy';
COMMENT ON COLUMN categories.parent_id IS 'NULL = root category; references own table for hierarchy';

-- ============================================================
-- TABLE: PRODUCTS
-- Master product catalog — all sellable items
-- ============================================================
CREATE TABLE products (
    product_id    NUMBER          DEFAULT seq_product.NEXTVAL   NOT NULL,
    category_id   NUMBER          NOT NULL,
    product_name  VARCHAR2(150)   NOT NULL,
    product_type  VARCHAR2(20)    NOT NULL,
    sku           VARCHAR2(50),
    unit_price    NUMBER(10,2)    NOT NULL,
    cost_price    NUMBER(10,2),
    description   VARCHAR2(1000),
    image_url     VARCHAR2(500),
    is_active     NUMBER(1)       DEFAULT 1,
    created_at    DATE            DEFAULT SYSDATE,
    updated_at    DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_products          PRIMARY KEY (product_id),
    CONSTRAINT fk_product_category  FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT uq_product_sku       UNIQUE      (sku),
    CONSTRAINT chk_product_type     CHECK       (product_type IN ('FISH','PLANT','TANK','EQUIPMENT','DECORATION')),
    CONSTRAINT chk_unit_price       CHECK       (unit_price  >= 0),
    CONSTRAINT chk_cost_price       CHECK       (cost_price  >= 0 OR cost_price IS NULL),
    CONSTRAINT chk_product_active   CHECK       (is_active   IN (0, 1))
);

COMMENT ON TABLE  products              IS 'Master catalog for all sellable items';
COMMENT ON COLUMN products.product_type IS 'FISH | PLANT | TANK | EQUIPMENT | DECORATION';
COMMENT ON COLUMN products.cost_price   IS 'Supplier cost — used for profit margin calculation';

-- ============================================================
-- TABLE: INVENTORY
-- One record per product — current stock levels
-- ============================================================
CREATE TABLE inventory (
    inventory_id    NUMBER          DEFAULT seq_inventory.NEXTVAL  NOT NULL,
    product_id      NUMBER          NOT NULL,
    qty_on_hand     NUMBER          DEFAULT 0,
    qty_reserved    NUMBER          DEFAULT 0,
    reorder_level   NUMBER          DEFAULT 10,
    reorder_qty     NUMBER          DEFAULT 50,
    last_updated    DATE            DEFAULT SYSDATE,
    -- Constraints
    CONSTRAINT pk_inventory          PRIMARY KEY (inventory_id),
    CONSTRAINT fk_inv_product        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_inv_product        UNIQUE      (product_id),
    CONSTRAINT chk_qty_on_hand       CHECK       (qty_on_hand   >= 0),
    CONSTRAINT chk_qty_reserved      CHECK       (qty_reserved  >= 0),
    CONSTRAINT chk_reorder_level     CHECK       (reorder_level >= 0),
    CONSTRAINT chk_reorder_qty       CHECK       (reorder_qty   > 0)
);

COMMENT ON TABLE  inventory               IS 'Per-product stock levels and reorder configuration';
COMMENT ON COLUMN inventory.qty_reserved  IS 'Units in open cart / pending orders — cannot be sold again';
COMMENT ON COLUMN inventory.reorder_level IS 'Triggers low stock alert when qty_on_hand reaches this value';

-- ============================================================
-- TABLE: TANKS
-- Aquarium tank specifications (links to PRODUCTS)
-- ============================================================
CREATE TABLE tanks (
    tank_id         NUMBER          DEFAULT seq_tank.NEXTVAL   NOT NULL,
    product_id      NUMBER          NOT NULL,
    volume_liters   NUMBER(8,2)     NOT NULL,
    length_cm       NUMBER(6,2),
    width_cm        NUMBER(6,2),
    height_cm       NUMBER(6,2),
    material        VARCHAR2(20),
    shape           VARCHAR2(20),
    has_hood        NUMBER(1)       DEFAULT 0,
    -- Constraints
    CONSTRAINT pk_tanks             PRIMARY KEY (tank_id),
    CONSTRAINT fk_tank_product      FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_tank_product      UNIQUE      (product_id),
    CONSTRAINT chk_tank_volume      CHECK       (volume_liters > 0),
    CONSTRAINT chk_tank_material    CHECK       (material IN ('GLASS','ACRYLIC','OTHER') OR material IS NULL),
    CONSTRAINT chk_tank_shape       CHECK       (shape    IN ('RECTANGULAR','BOWFRONT','HEX','CYLINDRICAL','CUBE','OTHER') OR shape IS NULL),
    CONSTRAINT chk_tank_hood        CHECK       (has_hood IN (0, 1))
);

COMMENT ON TABLE tanks IS 'Detailed tank specifications linked to product catalog';

-- ============================================================
-- TABLE: FISH
-- Fish species specifications (links to PRODUCTS)
-- ============================================================
CREATE TABLE fish (
    fish_id               NUMBER          DEFAULT seq_fish.NEXTVAL   NOT NULL,
    product_id            NUMBER          NOT NULL,
    species               VARCHAR2(150)   NOT NULL,
    common_name           VARCHAR2(100),
    water_type            VARCHAR2(20)    NOT NULL,
    min_temp_c            NUMBER(5,2)     NOT NULL,
    max_temp_c            NUMBER(5,2)     NOT NULL,
    min_ph                NUMBER(4,2),
    max_ph                NUMBER(4,2),
    min_tank_liters       NUMBER(8,2),
    max_fish_per_liter    NUMBER(6,4),
    is_aggressive         NUMBER(1)       DEFAULT 0,
    care_level            VARCHAR2(10),
    origin_region         VARCHAR2(100),
    lifespan_years        NUMBER(4,1),
    -- Constraints
    CONSTRAINT pk_fish              PRIMARY KEY (fish_id),
    CONSTRAINT fk_fish_product      FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_fish_product      UNIQUE      (product_id),
    CONSTRAINT chk_fish_water       CHECK       (water_type   IN ('FRESHWATER','SALTWATER','BRACKISH')),
    CONSTRAINT chk_fish_temp_range  CHECK       (min_temp_c   <  max_temp_c),
    CONSTRAINT chk_fish_temp_valid  CHECK       (min_temp_c   >= 0 AND max_temp_c <= 40),
    CONSTRAINT chk_fish_ph_range    CHECK       (min_ph IS NULL OR max_ph IS NULL OR min_ph < max_ph),
    CONSTRAINT chk_fish_ph_valid    CHECK       (min_ph IS NULL OR (min_ph >= 0 AND min_ph <= 14)),
    CONSTRAINT chk_fish_agg         CHECK       (is_aggressive IN (0, 1)),
    CONSTRAINT chk_fish_care        CHECK       (care_level   IN ('EASY','MEDIUM','HARD') OR care_level IS NULL)
);

COMMENT ON TABLE  fish                    IS 'Fish species catalog with water chemistry requirements';
COMMENT ON COLUMN fish.water_type         IS 'FRESHWATER | SALTWATER | BRACKISH';
COMMENT ON COLUMN fish.is_aggressive      IS '1 = aggressive — used by compatibility checker';
COMMENT ON COLUMN fish.max_fish_per_liter IS 'Stocking density cap for tank capacity validation';

-- ============================================================
-- TABLE: PLANTS
-- Aquatic plant specifications (links to PRODUCTS)
-- ============================================================
CREATE TABLE plants (
    plant_id            NUMBER          DEFAULT seq_plant.NEXTVAL  NOT NULL,
    product_id          NUMBER          NOT NULL,
    species             VARCHAR2(150),
    common_name         VARCHAR2(100),
    water_type          VARCHAR2(20)    NOT NULL,
    min_temp_c          NUMBER(5,2),
    max_temp_c          NUMBER(5,2),
    light_requirement   VARCHAR2(10),
    co2_required        NUMBER(1)       DEFAULT 0,
    growth_rate         VARCHAR2(10),
    placement           VARCHAR2(20),  -- FOREGROUND / MIDGROUND / BACKGROUND / FLOATING
    -- Constraints
    CONSTRAINT pk_plants            PRIMARY KEY (plant_id),
    CONSTRAINT fk_plant_product     FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_plant_product     UNIQUE      (product_id),
    CONSTRAINT chk_plant_water      CHECK       (water_type        IN ('FRESHWATER','SALTWATER','BRACKISH')),
    CONSTRAINT chk_plant_light      CHECK       (light_requirement IN ('LOW','MEDIUM','HIGH') OR light_requirement IS NULL),
    CONSTRAINT chk_plant_co2        CHECK       (co2_required      IN (0, 1)),
    CONSTRAINT chk_plant_growth     CHECK       (growth_rate       IN ('SLOW','MEDIUM','FAST') OR growth_rate IS NULL),
    CONSTRAINT chk_plant_placement  CHECK       (placement IN ('FOREGROUND','MIDGROUND','BACKGROUND','FLOATING') OR placement IS NULL),
    CONSTRAINT chk_plant_temp       CHECK       (min_temp_c IS NULL OR max_temp_c IS NULL OR min_temp_c < max_temp_c)
);

COMMENT ON TABLE plants IS 'Aquatic plant catalog with lighting and CO2 requirements';

-- ============================================================
-- TABLE: EQUIPMENT
-- Filters, heaters, lights, pumps (links to PRODUCTS)
-- ============================================================
CREATE TABLE equipment (
    equipment_id        NUMBER          DEFAULT seq_equipment.NEXTVAL  NOT NULL,
    product_id          NUMBER          NOT NULL,
    equipment_type      VARCHAR2(20)    NOT NULL,
    power_watts         NUMBER(8,2),
    suitable_liters_min NUMBER(8,2),
    suitable_liters_max NUMBER(8,2),
    voltage             VARCHAR2(20),
    brand               VARCHAR2(100),
    model_number        VARCHAR2(100),
    -- Constraints
    CONSTRAINT pk_equipment          PRIMARY KEY (equipment_id),
    CONSTRAINT fk_equip_product      FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_equip_product      UNIQUE      (product_id),
    CONSTRAINT chk_equip_type        CHECK       (equipment_type IN (
        'FILTER','HEATER','LIGHT','PUMP','CO2_SYSTEM','SKIMMER','UV_STERILIZER','OTHER'
    )),
    CONSTRAINT chk_equip_watts       CHECK       (power_watts IS NULL OR power_watts >= 0),
    CONSTRAINT chk_equip_liter_range CHECK       (suitable_liters_min IS NULL OR suitable_liters_max IS NULL
                                                  OR suitable_liters_min < suitable_liters_max)
);

COMMENT ON TABLE  equipment                IS 'Equipment catalog with suitability ranges per tank size';
COMMENT ON COLUMN equipment.equipment_type IS 'FILTER|HEATER|LIGHT|PUMP|CO2_SYSTEM|SKIMMER|UV_STERILIZER|OTHER';

-- ============================================================
-- TABLE: DECORATIONS
-- Rocks, driftwood, substrates (links to PRODUCTS)
-- ============================================================
CREATE TABLE decorations (
    decoration_id   NUMBER          DEFAULT seq_deco.NEXTVAL   NOT NULL,
    product_id      NUMBER          NOT NULL,
    deco_type       VARCHAR2(30),
    material        VARCHAR2(50),
    is_natural      NUMBER(1)       DEFAULT 0,
    safe_water_type VARCHAR2(20),
    size_class      VARCHAR2(15),   -- SMALL / MEDIUM / LARGE / XL
    -- Constraints
    CONSTRAINT pk_decorations        PRIMARY KEY (decoration_id),
    CONSTRAINT fk_deco_product       FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_deco_product       UNIQUE      (product_id),
    CONSTRAINT chk_deco_natural      CHECK       (is_natural      IN (0, 1)),
    CONSTRAINT chk_deco_water        CHECK       (safe_water_type IN ('FRESHWATER','SALTWATER','BOTH') OR safe_water_type IS NULL),
    CONSTRAINT chk_deco_size         CHECK       (size_class      IN ('SMALL','MEDIUM','LARGE','XL') OR size_class IS NULL),
    CONSTRAINT chk_deco_type         CHECK       (deco_type       IN ('ROCK','DRIFTWOOD','CASTLE','CAVE','SUBSTRATE','CORAL','PLANT_REPLICA','OTHER') OR deco_type IS NULL)
);

COMMENT ON TABLE decorations IS 'Decoration catalog — rocks, wood, substrate, ornaments';

-- ============================================================
-- VERIFY CREATION
-- ============================================================
SELECT table_name, num_rows
FROM user_tables
WHERE table_name IN (
    'ROLES','USERS','CUSTOMERS','SUPPLIERS','CATEGORIES',
    'PRODUCTS','INVENTORY','TANKS','FISH','PLANTS','EQUIPMENT','DECORATIONS'
)
ORDER BY table_name;

PROMPT MODULE 2 — Core schema created successfully.
