INSERT INTO roles (name, description)
SELECT 'Admin', 'Administrator role with full access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Admin');

INSERT INTO roles (name, description)
SELECT 'plant_manager', 'Plant manager role with limited access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'plant_manager');

INSERT INTO roles (name, description)
SELECT 'sensor_operator', 'Sensor operator role with limited access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'sensor_operator');

-- Password hash for 'admin123' using bcrypt with 10 salt rounds
INSERT INTO users (username, email, password_hash, role_id)
SELECT 'admin', 'admin@example.com', '$2b$10$LI8jxCALz3oSMT3C16xamOqnPhxRn.JsD1iq8Po4A9SbTfdLTTVj.', (SELECT id FROM roles WHERE name = 'Admin')
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