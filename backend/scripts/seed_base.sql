INSERT INTO roles (name, description)
SELECT 'Admin', 'Administrator role with full access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Admin');

INSERT INTO roles (name, description)
SELECT 'plant_manager', 'Plant manager role with limited access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'plant_manager');

INSERT INTO roles (name, description)
SELECT 'sensor_operator', 'Sensor operator role with limited access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'sensor_operator');

-- pgcrypto gives us bcrypt inside Postgres, so the seed takes a plaintext
-- password from the environment and hashes it here. Nothing secret is stored
-- in this file, and a deployment can set its own password without editing SQL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Passed by the caller as -v admin_password=... ; psql aborts if it is missing,
-- rather than inserting the literal string ":admin_password" as a password.
\if :{?admin_password}
\else
  \echo 'ERROR: admin_password is not set. Pass it with: psql -v admin_password=...'
  \q
\endif

INSERT INTO users (username, email, password_hash, role_id)
SELECT 'admin', 'admin@example.com', crypt(:'admin_password', gen_salt('bf', 10)), (SELECT id FROM roles WHERE name = 'Admin')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

UPDATE roles SET created_by = (SELECT id FROM users WHERE username = 'admin'), updated_by = (SELECT id FROM users WHERE username = 'admin') WHERE name = 'Admin' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Admin' AND created_by IS NOT NULL AND updated_by IS NOT NULL);

INSERT INTO plants (name, description, plant_manager_id)
SELECT 'Plant A', 'Description for Plant A', (SELECT id FROM users WHERE username = 'admin')
WHERE NOT EXISTS (SELECT 1 FROM plants WHERE name = 'Plant A');

INSERT INTO locations (name, plant_id, description)
SELECT 'Location 1', (SELECT id FROM plants WHERE name = 'Plant A'), 'Description for Location 1'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Location 1' AND plant_id = (SELECT id FROM plants WHERE name = 'Plant A'));

INSERT INTO sensors (name, location_id, unit, type, created_by)
SELECT 'Sensor 1', (SELECT id FROM locations WHERE name = 'Location 1'), 'C', 'temperature', (SELECT id FROM users WHERE username = 'admin')
WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Sensor 1' AND location_id = (SELECT id FROM locations WHERE name = 'Location 1'));