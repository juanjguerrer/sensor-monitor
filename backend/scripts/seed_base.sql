INSERT INTO roles (name, description) VALUES
('Admin', 'Administrator role with full access'),
('plant_manager', 'Plant manager role with limited access'),
('sensor_operator', 'Sensor operator role with limited access');

INSERT INTO users (username, email, password_hash, role_id) VALUES
('admin', 'admin@example.com', 'hashed_password', (SELECT id FROM roles WHERE name = 'Admin'));

UPDATE roles SET created_by = (SELECT id FROM users WHERE username = 'admin'), updated_by = (SELECT id FROM users WHERE username = 'admin') WHERE name = 'Admin';

INSERT INTO plants (name, description, plant_manager_id) VALUES
('Plant A', 'Description for Plant A', (SELECT id FROM users WHERE username = 'admin'));

INSERT INTO locations (name, plant_id, description) VALUES
('Location 1', (SELECT id FROM plants WHERE name = 'Plant A'), 'Description for Location 1');