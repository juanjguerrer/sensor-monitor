import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('roles', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    username: { type: 'varchar(50)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role_id: { type: 'integer', references: '"roles"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.addColumn('roles', {
    created_by: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
    updated_by: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
  });
  pgm.createTable('plants', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    plant_manager_id: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createTable('locations', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    plant_id: { type: 'integer', notNull: true, references: '"plants"', onDelete: 'RESTRICT' },
    description: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createTable('sensors', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    location_id: { type: 'integer', notNull: true, references: '"locations"', onDelete: 'RESTRICT' },
    unit: { type: 'varchar(50)', notNull: true },
    type: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    created_by: { type: 'integer', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_by: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
  });

  pgm.createTable('readings', {
    id: { type: 'serial', primaryKey: true },
    sensor_id: { type: 'integer', notNull: true, references: '"sensors"', onDelete: 'CASCADE' },
    value: { type: 'float', notNull: true },
    recorded_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('readings', 'sensor_id');
  pgm.createIndex('readings', 'recorded_at');
}