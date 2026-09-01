// Simulate sensor readings for testing purposes
import 'dotenv/config';
import { addReading, deleteAllReadingsFromSensor, listSensors } from '../db/repository';
import  pool  from '../db/pool';
const TIME_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const LIVE_INTERVAL = 5 * 1000; // 5 seconds between readings in live mode
const TOTAL_READINGS = 200; // Total number of readings to simulate
const TOTAL_BAD_READINGS = Math.floor(TOTAL_READINGS * 0.03); // 3% of total readings will be out of limit readings
const STDDEV = 10; // Standard deviation for the normal distribution
const MEAN = 50; // Mean for the normal distribution
const MIN_OUTLIER_SIGMA = 4; // Outliers sit at least this many stddevs from the mean
const MAX_OUTLIER_SIGMA = 8; // ...and at most this many

function randomValue() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * STDDEV + MEAN; // Random value with mean 50 and stddev 10
}

// An out-of-limit reading of varying size, above or below the mean. Using a single
// constant here makes every anomaly identical, which is not what real faults look
// like and lets any consumer "detect" them by matching one number.
function outlierValue() {
  const sigma = MIN_OUTLIER_SIGMA + Math.random() * (MAX_OUTLIER_SIGMA - MIN_OUTLIER_SIGMA);
  const low = MEAN - sigma * STDDEV;
  // Only dip below the mean when it stays positive; a negative reading is not meaningful here.
  return Math.random() < 0.5 && low > 0 ? low : MEAN + sigma * STDDEV;
}

// Random positions for the out-of-limit readings, so they are not evenly spaced.
function outlierIndexes(total: number, count: number) {
  const indexes = new Set<number>();
  while (indexes.size < count) {
    indexes.add(1 + Math.floor(Math.random() * (total - 1))); // never the first reading
  }
  return indexes;
}

async function simulateSensorReadings(sensorId: number) {
  const total = TOTAL_READINGS + TOTAL_BAD_READINGS;
  const dateNow = new Date().getTime();
  const badIndexes = outlierIndexes(total, TOTAL_BAD_READINGS);
  for (let i = 0; i < total; i++) {
    // Calculate the recordedAt timestamp based on the current time, should be in the past, and spaced by TIME_INTERVAL
    const recordedAt = dateNow - (total - i) * TIME_INTERVAL;
    const value = badIndexes.has(i) ? outlierValue() : randomValue();
    if (badIndexes.has(i)) {
      console.log(`Added out of limit reading: ${value.toFixed(2)}`);
    }
    await addReading(sensorId, value, new Date(recordedAt));
  }
  console.log('Simulation complete.');
}

// Appends one reading at a time until interrupted, so the frontend has something
// to poll for. Existing readings are left alone.
async function simulateLiveReadings(sensorIds: number[]) {
  let running = true;
  process.on('SIGINT', () => {
    console.log('\nStopping...');
    running = false;
  });

  console.log(`Appending a reading for ${sensorIds.length} sensor(s) every ${LIVE_INTERVAL / 1000}s. Press Ctrl+C to stop.`);
  while (running) {
    for (const sensorId of sensorIds) {
      const value = randomValue();
      const reading = await addReading(sensorId, value, new Date());
      console.log(`Sensor ${sensorId}: added reading ${reading.id}: ${value.toFixed(2)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, LIVE_INTERVAL));
  }
}

async function deleteReadingsSensor(sensorId: number) {
  await deleteAllReadingsFromSensor(sensorId);
  console.log(`Deleted all readings for sensor ${sensorId}`);
}

async function simulate() {
  const sensors = await listSensors();
  if (sensors.length === 0) {
    console.log('No sensors found. Seed the database first.');
    return;
  }

  if (process.argv.includes('--live')) {
    await simulateLiveReadings(sensors.map((sensor) => sensor.id));
    return;
  }

  for (const sensor of sensors) {
    console.log(`Starting simulation for sensor ${sensor.id} (${sensor.name})...`);
    await deleteReadingsSensor(sensor.id);
    await simulateSensorReadings(sensor.id);
  }
}

void simulate()
  .catch((error) => {
    console.error('Error during simulation:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end() );
