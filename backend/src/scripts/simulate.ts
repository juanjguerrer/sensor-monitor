// Simulate sensor readings for testing purposes
import 'dotenv/config';
import { addReading, deleteAllReadingsFromSensor } from '../db/repository';
import  pool  from '../db/pool';
const TIME_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const TOTAL_READINGS = 200; // Total number of readings to simulate
const TOTAL_BAD_READINGS = Math.floor(TOTAL_READINGS * 0.03); // 3% of total readings will be out of limit readings
const STDDEV = 10; // Standard deviation for the normal distribution
const MEAN = 50; // Mean for the normal distribution
const OUT_OF_LIMIT_VALUE = MEAN * 2;

async function simulateSensorReadings(sensorId: number) {
  const total = TOTAL_READINGS + TOTAL_BAD_READINGS;
  const dateNow = new Date().getTime();
  for (let i = 0; i < total; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const value = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * STDDEV + MEAN; // Random value with mean 50 and stddev 10
    // Calculate the recordedAt timestamp based on the current time, should be in the past, and spaced by TIME_INTERVAL
    const recordedAt = dateNow - (total - i) * TIME_INTERVAL;
    if (i % Math.floor(TOTAL_READINGS / TOTAL_BAD_READINGS) === 0 && i !== 0) {
      // Add out of limit readings
      console.log(`Added out of limit reading: ${OUT_OF_LIMIT_VALUE}`);
      await addReading(sensorId, OUT_OF_LIMIT_VALUE, new Date(recordedAt));
    } else {
      await addReading(sensorId, value, new Date(recordedAt));
    }
  }
  console.log('Simulation complete.');
}

async function deleteReadingsSensor(sensorId: number) {
  await deleteAllReadingsFromSensor(sensorId);
  console.log(`Deleted all readings for sensor ${sensorId}`);
}

async function simulate() {
  const sensorId = 1; // Assuming the sensor with ID 1 exists
  console.log(`Starting simulation for sensor ${sensorId}...`);
  await deleteReadingsSensor(sensorId);
  await simulateSensorReadings(sensorId);
}

simulate().finally(() => {
  pool.end();
});