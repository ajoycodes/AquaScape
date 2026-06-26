-- ============================================================
-- SEED: COMPATIBILITY RULES
-- Demonstrates the compatibility engine with real-world rules.
-- severity: ERROR = blocks insert, WARNING = advisory only
-- rule_type: INCOMPATIBLE / REQUIRES / NEUTRAL
-- ============================================================

PROMPT Seeding compatibility rules...

-- ── INCOMPATIBLE RULES (ERROR level) ─────────────────────────

-- Betta vs Neon Tetra: bettas shred neon fins
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Betta Splendens (Male)'),
    (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'),
    'INCOMPATIBLE', 'ERROR',
    'Betta males aggressively attack and eat Neon Tetras. Fatal conflict.'
);

-- Betta vs Guppy: bettas attack fancy guppy fins
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Betta Splendens (Male)'),
    (SELECT product_id FROM products WHERE product_name = 'Guppy (Assorted)'),
    'INCOMPATIBLE', 'ERROR',
    'Betta males fin-nip and kill guppies due to similar finnage appearance.'
);

-- Betta vs Angelfish: both aggressive, territorial conflict
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Betta Splendens (Male)'),
    (SELECT product_id FROM products WHERE product_name = 'Angelfish'),
    'INCOMPATIBLE', 'ERROR',
    'Both species are aggressive and territorial. High stress and injury risk.'
);

-- Angelfish vs Neon Tetra (size mismatch — angels eat neons)
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Angelfish'),
    (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'),
    'INCOMPATIBLE', 'ERROR',
    'Adult angelfish will hunt and eat neon tetras. Size predator-prey mismatch.'
);

-- Freshwater fish with coral decor: calcium leaching risk
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'),
    (SELECT product_id FROM products WHERE product_name = 'Coral Skeleton Decor'),
    'INCOMPATIBLE', 'WARNING',
    'Coral skeleton decor may leach calcium and raise pH beyond neon tetra tolerance (6.0-7.5).'
);

-- ── WARNING RULES (advisory only) ────────────────────────────

-- Angelfish with Corydoras: generally fine but monitor
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Angelfish'),
    (SELECT product_id FROM products WHERE product_name = 'Corydoras Catfish'),
    'NEUTRAL', 'WARNING',
    'Angelfish may peck at corydoras during breeding. Monitor behaviour carefully.'
);

-- Blue Tang needs very large tank
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Blue Tang'),
    (SELECT product_id FROM products WHERE product_name = 'NanoReef 30L Cube'),
    'INCOMPATIBLE', 'ERROR',
    'Blue Tang requires a minimum of 200L. A 30L nano tank causes severe stress and disease.'
);

-- ── NEUTRAL / RECOMMENDED PAIRINGS ────────────────────────────

-- Neon Tetra + Corydoras: classic community pairing
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Neon Tetra'),
    (SELECT product_id FROM products WHERE product_name = 'Corydoras Catfish'),
    'NEUTRAL', 'WARNING',
    'Excellent pairing. Corydoras clean up leftover neon food from the substrate.'
);

-- Clownfish + Coral Skeleton Decor: natural reef look
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Ocellaris Clownfish'),
    (SELECT product_id FROM products WHERE product_name = 'Coral Skeleton Decor'),
    'NEUTRAL', 'WARNING',
    'Clownfish associate with coral structures. Recommended for naturalistic reef display.'
);

-- Bristlenose + Driftwood: plecos rasp on wood for fibre
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Bristlenose Pleco'),
    (SELECT product_id FROM products WHERE product_name = 'Natural Driftwood (Medium)'),
    'NEUTRAL', 'WARNING',
    'Plecos rasp wood for essential dietary fibre. Driftwood greatly improves pleco health.'
);

-- Dwarf Hairgrass needs CO2 kit
INSERT INTO compatibility_rules (rule_id, product_id_a, product_id_b, rule_type, severity, reason)
VALUES (seq_compat_rule.NEXTVAL,
    (SELECT product_id FROM products WHERE product_name = 'Dwarf Hairgrass'),
    (SELECT product_id FROM products WHERE product_name = 'CO2 Diffuser Kit'),
    'REQUIRES', 'WARNING',
    'Dwarf Hairgrass requires CO2 injection to achieve dense carpet growth.'
);

COMMIT;
PROMPT Compatibility rules seeded.
