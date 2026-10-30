
const pool = require("../src/db");
const { performance } = require("node:perf_hooks");

const WARMUP_RUNS = 2;
const MEASURED_RUNS = 7;

const queries = [
  {
    name: "Events by user",
    sql: `
      SELECT id, user_id, event_name, created_at
      FROM events
      WHERE user_id = $1
      ORDER BY id
      LIMIT 50
    `,
    params: [500],
  },
  {
    name: "Recent events",
    sql: `
      SELECT id, user_id, event_name, created_at
      FROM events
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 50
    `,
    params: [],
  },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

async function measureQuery(query) {
  // Warm up PostgreSQL and the connection before recording measurements.
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await pool.query(query.sql, query.params);
  }

  const times = [];

  for (let i = 0; i < MEASURED_RUNS; i++) {
    const start = performance.now();

    await pool.query(query.sql, query.params);

    times.push(performance.now() - start);
  }

  const average = times.reduce((sum, time) => sum + time, 0) / times.length;

  return {
    name: query.name,
    runs: times.length,
    averageMs: average,
    medianMs: median(times),
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    measurements: times,
  };
}

async function main() {
  try {
    const count = await pool.query("SELECT COUNT(*) FROM events");

    console.log(`Total events: ${count.rows[0].count}`);
    console.log(`Warm-up runs per query: ${WARMUP_RUNS}`);
    console.log(`Measured runs per query: ${MEASURED_RUNS}\n`);

    for (const query of queries) {
      const result = await measureQuery(query);

      console.log(`--- ${result.name} ---`);
      console.log(`Measurements: ${result.measurements.map((ms) => ms.toFixed(3)).join(", ")} ms`);
      console.log(`Average: ${result.averageMs.toFixed(3)} ms`);
      console.log(`Median:  ${result.medianMs.toFixed(3)} ms`);
      console.log(`Minimum: ${result.minMs.toFixed(3)} ms`);
      console.log(`Maximum: ${result.maxMs.toFixed(3)} ms\n`);
    }
  } catch (error) {
    console.error("Benchmark failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
