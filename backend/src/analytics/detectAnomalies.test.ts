import { Reading } from "../db/types";
import { detectAnomalies } from "./detectAnomalies";

function buildReadings(values: number[]): Reading[] {
  return values.map((value, i) => ({
    id: i + 1,
    sensorId: 1,
    value,
    recordedAt: new Date(2026, 0, 1, 0, i),
  }));
}

test('detectAnomalies returns empty array for empty readings', () => {
  const readings: Reading[] = [];
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies).toEqual([]);
});

test('detectAnomalies returns empty array for not enough readings', () => {
  const readings: Reading[] = buildReadings([10, 12]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies).toEqual([]);
});

test('detectAnomalies returns empty array for all readings with same value', () => {
  const readings: Reading[] = buildReadings([6, 6, 6, 6, 6, 6, 6]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies).toEqual([]);
});

test('detectAnomalies detects anomalies correctly', () => {
  const readings: Reading[] = buildReadings([
    10,
    12,
    11,
    50, // Anomaly
    13,
    9,
    8,
  ]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies.length).toBe(1);
  expect(anomalies[0]!.value).toBe(50);
});

test('detectAnomalies returns empty array when no anomalies are present', () => {
  const readings: Reading[] = buildReadings([
    10,
    12,
    11,
    13,
    9,
    8
  ]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies).toEqual([]);
});

test('detectAnomalies returns empty array when threshold is invalid', () => {
  const readings: Reading[] = buildReadings([
    10,
    12,
    11,
  ]);
  const threshold1 = -1;
  const threshold2 = 0;
  const threshold3 = NaN;
  const threshold4 = Infinity;
  expect(detectAnomalies(readings, threshold1)).toEqual([]);
  expect(detectAnomalies(readings, threshold2)).toEqual([]);
  expect(detectAnomalies(readings, threshold3)).toEqual([]);
  expect(detectAnomalies(readings, threshold4)).toEqual([]);
});

test('z score is calculated correctly for detected anomalies', () => {
  const readings: Reading[] = buildReadings([
    10,
    12,
    11,
    -50, // Anomaly
    13,
    9,
    8,
  ]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies.length).toBe(1);
  const anomaly = anomalies[0]!;
  expect(anomaly.zScore).toBeLessThan(0);
});

test('detectAnomalies returns id and timestamp correctly for detected anomalies', () => {
  const readings: Reading[] = buildReadings([
    10,
    12,
    11,
    100, // Anomaly
    13,
    9,
    8,
  ]);
  const threshold = 2;
  const anomalies = detectAnomalies(readings, threshold);
  expect(anomalies.length).toBe(1);
  const anomaly = anomalies[0]!;
  expect(anomaly.readingId).toBe(4);
  expect(anomaly.timestamp).toBe(readings[3]!.recordedAt);
  expect(anomaly.zScore).toBeGreaterThan(threshold);
});