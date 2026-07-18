-- Adds password authentication to customer accounts.
-- Run as AQUASCAPE user.

-- Customers authenticate with email + password (scrypt salt:hash)
ALTER TABLE customers ADD (password_hash VARCHAR2(255));

COMMENT ON COLUMN customers.password_hash IS 'scrypt salt:hash — set at registration, never stored in plain text';

-- Default password for seeded demo customers: fish123
UPDATE customers
SET    password_hash = '0e06ec85a015e255113ef6bf546cce78:4992b4a712585b79c26388a30995ffb00f62890cc7bf64dab99f7683482a6345458e1b857bc0dc2c722a46f31e1ae580fcb73c0f58951bccb068eb544694a8ea'
WHERE  password_hash IS NULL;

-- Admin credentials: admin / admin (replaces seed placeholder hash)
UPDATE users
SET    password_hash = 'a06413bca6534a515c1d3cf86f8f2e23:0aa31eb56d4989e35ca3e39253ef9f0d335f64cd5801033e604b9572a68233015cf6aeb272823617430ce92cf0b8b6c35be7a0c69d543016471fe7617e74dee1'
WHERE  username = 'admin';

COMMIT;

PROMPT MODULE 5 — Auth migration complete.
