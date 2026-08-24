export interface Sensor {
  id: number;
  name: string;
  locationId: number;
  unit: string;
  type: string;
}

export interface Reading {
  id: number;
  sensorId: number;
  value: number;
  recordedAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  roleId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: number;
  name: string;
  plantId: number;
  description: string | null;
}

export type UserCredentials = Pick<User, 'id' | 'passwordHash'>;