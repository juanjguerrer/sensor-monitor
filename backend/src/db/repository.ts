import { NotFoundError } from "./errors";
import pool  from "./pool";
import { Location, Reading, Sensor, User, UserCredentials } from "./types";

export async function listSensors() {
  const result = await pool.query<Sensor>('SELECT id, name, location_id AS "locationId", unit, type FROM sensors');
  return result.rows;
}

export async function createSensor(sensor: Omit<Sensor, 'id'>, userId: number) {
  const result = await pool.query<Sensor>(
    'INSERT INTO sensors (name, location_id, unit, type, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, location_id AS "locationId", unit, type',
    [sensor.name, sensor.locationId, sensor.unit, sensor.type, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error('INSERT returned no row');
  return row;
}

export async function getSensorById(id: number) {
  const result = await pool.query<Sensor>(
    'SELECT id, name, location_id AS "locationId", unit, type FROM sensors WHERE id = $1',
    [id]
  );
  const row = result.rows[0] ?? null;
  return row;
}

export async function updateSensor(sensor: Sensor, userId: number) {
  const result = await pool.query<Sensor>(
    'UPDATE sensors SET name = $1, location_id = $2, unit = $3, type = $4, updated_at = NOW(), updated_by = $6 WHERE id = $7 RETURNING id, name, location_id AS "locationId", unit, type, created_by AS "createdBy"',
    [sensor.name, sensor.locationId, sensor.unit, sensor.type, userId, sensor.id]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Sensor', sensor.id);
  return row;
}

export async function deleteSensor(id: number) {
  const result = await pool.query<{ id: number }>(
    'DELETE FROM sensors WHERE id = $1 RETURNING id',
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Sensor', id);
  return row.id;
}

export async function addReading(sensorId: number, value: number, recordedAt?: Date) {
  const result = await pool.query<Reading>(
    'INSERT INTO readings (sensor_id, value, recorded_at) VALUES ($1, $2, $3) RETURNING id, sensor_id AS "sensorId", value, recorded_at AS "recordedAt"',
    [sensorId, value, recordedAt ?? new Date()]
  );
  const row = result.rows[0];
  if (!row) throw new Error('INSERT returned no row');
  return row;
}

export async function deleteAllReadingsFromSensor(sensorId: number) {
  await pool.query('DELETE FROM readings WHERE sensor_id = $1', [sensorId]);
}

export async function listReadings(sensorId: number, limit: number) {
  const result = await pool.query<Reading>(
    'SELECT id, sensor_id AS "sensorId", value, recorded_at AS "recordedAt" FROM readings WHERE sensor_id = $1 ORDER BY recorded_at DESC LIMIT $2',
    [sensorId, limit]
  );
  return result.rows;
}

export async function findUserByUsername(username: string) {
  const result = await pool.query<UserCredentials>(
    'SELECT id, username, password_hash AS "passwordHash" FROM users WHERE username = $1',
    [username]
  );
  const row = result.rows[0] ?? null;
  return row;
}

export async function getLocationById(id: number) {
  const result = await pool.query<Location>(
    'SELECT id, name, plant_id AS "plantId", description FROM locations WHERE id = $1',
    [id]
  );
  const row = result.rows[0] ?? null;
  return row;
}

export async function listLocationsByIds(ids: readonly number[]) {
  if (ids.length === 0) return [];
  const result = await pool.query<Location>(
    `SELECT id, name, plant_id AS "plantId", description FROM locations WHERE id = ANY($1)`,
    [ids]
  );
  return result.rows;
}