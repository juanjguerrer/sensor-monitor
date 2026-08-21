import type { Reading } from "../db/types";

export interface Anomaly {
  readingId: number;
  timestamp: Date;
  value: number;
  deviation: number;
  zScore: number;
}

export function detectAnomalies(readings: Reading[], threshold: number): Anomaly[] {
  if (threshold <= 0 || !Number.isFinite(threshold)) {
    return [];
  }
  const anomalies: Anomaly[] = [];
  const values = readings.map(r => r.value);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);
  if (variance === 0) {
    // All readings have the same value, no anomalies can be detected
    return [];
  }
  for (const reading of readings) {
    const deviation = Math.abs(reading.value - mean);
    if (deviation > threshold * stdDev) {
      anomalies.push({
        timestamp: reading.recordedAt,
        value: reading.value,
        deviation: deviation,
        readingId: reading.id,
        zScore: (reading.value - mean) / stdDev
      });
    }
  }
  return anomalies;
}

export function maxZScore(n: number): number {
  if (n <= 0) {
    return 0;
  }
  return (n - 1)/Math.sqrt(n);
}