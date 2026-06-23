-- ============================================================
-- SEED: ROLES & USERS
-- ============================================================

PROMPT Seeding roles and users...

-- Roles (skip if already exist)
INSERT INTO roles (role_id, role_name, description)
SELECT seq_role.NEXTVAL, 'ADMIN', 'Full system access' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'ADMIN');

INSERT INTO roles (role_id, role_name, description)
SELECT seq_role.NEXTVAL, 'MANAGER', 'Inventory and order management' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'MANAGER');

INSERT INTO roles (role_id, role_name, description)
SELECT seq_role.NEXTVAL, 'STAFF', 'Day-to-day operations' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'STAFF');

INSERT INTO roles (role_id, role_name, description)
SELECT seq_role.NEXTVAL, 'VIEWER', 'Read-only access' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'VIEWER');

-- Users (no full_name column in schema)
INSERT INTO users (user_id, role_id, username, password_hash, email)
SELECT seq_user.NEXTVAL,
       (SELECT role_id FROM roles WHERE role_name = 'ADMIN'),
       'admin', '$2y$12$hashedpasswordhere1', 'admin@aquascape.com'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (user_id, role_id, username, password_hash, email)
SELECT seq_user.NEXTVAL,
       (SELECT role_id FROM roles WHERE role_name = 'MANAGER'),
       'mgr_sam', '$2y$12$hashedpasswordhere2', 'sam@aquascape.com'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'mgr_sam');

INSERT INTO users (user_id, role_id, username, password_hash, email)
SELECT seq_user.NEXTVAL,
       (SELECT role_id FROM roles WHERE role_name = 'STAFF'),
       'staff_jo', '$2y$12$hashedpasswordhere3', 'jo@aquascape.com'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'staff_jo');

COMMIT;
PROMPT Roles and users seeded.
