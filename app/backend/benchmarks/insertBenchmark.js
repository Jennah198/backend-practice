const { performance } = require("node:perf_hooks");
const pool = require("../src/db");

const ROW_COUNT = 1000;
const BATCH_SIZE = 100;
const RUNS = 3;

function createEvent(i) {
  return [
    i + 1,
    "benchmark_event",
    "Ethiopia",
    JSON.stringify({
      source: "insert_benchmark",
      device: "desktop",
    }),
  ];
}

async function sequentialInsert(events) {
  for (const event of events) {
    await pool.query(
      `INSERT INTO events
       (user_id, event_name, country, metadata)
       VALUES ($1, $2, $3, $4)`,
      event
    );
  }
}

async function batchInsert(events) {
  for (let start = 0; start < events.length; start += BATCH_SIZE) {
    const batch = events.slice(start, start + BATCH_SIZE);

    const values = [];
    const placeholders = [];

    batch.forEach((event, index) => {
      const position = index * 4;

      placeholders.push(
        `($${position + 1}, $${position + 2}, $${position + 3}, $${position + 4})`
      );

      values.push(...event);
    });

    await pool.query(
      `INSERT INTO events
       (user_id, event_name, country, metadata)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  }
}

async function measure(label, insertFn, events) {
  const start = performance.now();

  await insertFn(events);

  const duration = performance.now() - start;
  const throughput = (events.length / duration) * 1000;

  console.log(
    `${label}: ${duration.toFixed(2)} ms | ${throughput.toFixed(0)} rows/sec`
  );

  return duration;
}

async function cleanup() {
  await pool.query(
    `DELETE FROM events
     WHERE metadata->>'source' = 'insert_benchmark'`
  );
}

async function main() {
  const events = Array.from(
    { length: ROW_COUNT },
    (_, i) => createEvent(i)
  );

  try {
    const results = {
      sequential: [],
      batch: [],
    };

    for (let run = 1; run <= RUNS; run++) {
      console.log(`\n--- Run ${run} of ${RUNS} ---`);

      // Alternate order to reduce ordering bias.
      const methods = run % 2 === 1
        ? [
            ["Sequential", sequentialInsert, "sequential"],
            ["Batch", batchInsert, "batch"],
          ]
        : [
            ["Batch", batchInsert, "batch"],
            ["Sequential", sequentialInsert, "sequential"],
          ];

      for (const [label, fn, key] of methods) {
        await cleanup();

        const duration = await measure(label, fn, events);
        results[key].push(duration);
      }
    }

    const average = (values) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const sequentialAvg = average(results.sequential);
    const batchAvg = average(results.batch);

    console.log("\n--- Benchmark Summary ---");
    console.log(`Sequential average: ${sequentialAvg.toFixed(2)} ms`);
    console.log(`Batch average: ${batchAvg.toFixed(2)} ms`);
    console.log(
      `Speedup: ${(sequentialAvg / batchAvg).toFixed(2)}x`
    );
  } catch (error) {
    console.error("Benchmark failed:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup();
    } finally {
      await pool.end();
    }
  }
}

main();