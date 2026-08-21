import { DatabaseError } from "pg";

// constaint map
export const constraintMap: { [key: string]: { message: string; code: string } } = {
  'sensors_location_id_fkey': { message: 'Location not found', code: 'LOCATION_NOT_FOUND' },
  'readings_sensor_id_fkey': { message: 'Sensor not found', code: 'SENSOR_NOT_FOUND' },
  'locations_plant_id_fkey': { message: 'Plant not found', code: 'PLANT_NOT_FOUND' },
  'users_role_id_fkey': { message: 'Role not found', code: 'ROLE_NOT_FOUND' },
  'plants_plant_manager_id_fkey': { message: 'Plant manager not found', code: 'PLANT_MANAGER_NOT_FOUND' }
};

export function mapDbError(error: unknown): { message: string; code: string } | null {
  if (error instanceof DatabaseError && error.code === '23503') {
    const cons = error.constraint;
    if (cons && constraintMap[cons]) {
      return constraintMap[cons];
    }
  }
  return null;
}
