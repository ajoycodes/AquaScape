-- ============================================================
-- SEED: SUPPLIERS
-- ============================================================

PROMPT Seeding suppliers...

INSERT INTO suppliers (supplier_id, supplier_name, contact_name, email, phone, address, payment_terms)
SELECT seq_supplier.NEXTVAL, 'OceanBreeze Imports', 'Maria Chen', 'maria@oceanbreezeimports.com', '555-0101', '12 Coral Ave, Miami FL 33101', 'NET30'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE email = 'maria@oceanbreezeimports.com');

INSERT INTO suppliers (supplier_id, supplier_name, contact_name, email, phone, address, payment_terms)
SELECT seq_supplier.NEXTVAL, 'FreshWater Direct', 'James Okafor', 'james@freshwaterdirect.com', '555-0202', '88 River Rd, Atlanta GA 30301', 'NET15'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE email = 'james@freshwaterdirect.com');

INSERT INTO suppliers (supplier_id, supplier_name, contact_name, email, phone, address, payment_terms)
SELECT seq_supplier.NEXTVAL, 'AquaPlant Solutions', 'Yuki Tanaka', 'yuki@aquaplantsolutions.com', '555-0303', '5 Lily Pond Dr, Seattle WA 98101', 'NET30'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE email = 'yuki@aquaplantsolutions.com');

INSERT INTO suppliers (supplier_id, supplier_name, contact_name, email, phone, address, payment_terms)
SELECT seq_supplier.NEXTVAL, 'ProTank Equipment Co', 'Lena Volkov', 'lena@protankequip.com', '555-0404', '200 Industrial Blvd, Chicago IL 60601', 'NET45'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE email = 'lena@protankequip.com');

COMMIT;
PROMPT Suppliers seeded.
