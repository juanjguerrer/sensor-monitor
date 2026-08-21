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