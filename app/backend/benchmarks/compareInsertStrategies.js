const { performance } = require("node:perf_hooks");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { from: copyFrom } = require("pg-copy-streams");
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
      source: "strategy_benchmark",
      device: "desktop",
    }),
  ];
}

const events = Array.from(
  { length: ROW_COUNT },
  (_, i) => createEvent(i)
);

async function sequentialInsert() {
  for (const event of events) {
    await pool.query(
      `INSERT INTO events (user_id, event_name, country, metadata)
       VALUES ($1, $2, $3, $4)`,
      event
    );
  }
}

async function batchInsert() {
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
      `INSERT INTO events (user_id, event_name, country, metadata)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  }
}

function csvField(value) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function copyInsert() {
  const client = await pool.connect();

  try {
    const copyStream = client.query(
      copyFrom(`
        COPY events (user_id, event_name, country, metadata)
        FROM STDIN WITH (FORMAT csv)
      `)
    );

    async function* rows() {
      for (const event of events) {
        yield event.map(csvField).join(",") + "\n";
      }
    }

    await pipeline(Readable.from(rows()), copyStream);
  } finally {
    client.release();
  }
}

async function cleanup() {
  await pool.query(
    `DELETE FROM events
     WHERE metadata->>'source' = 'strategy_benchmark'`
  );
}

async function measure(label, insert) {
  const start = performance.now();

  await insert();

  const duration = performance.now() - start;
  const throughput = (ROW_COUNT / duration) * 1000;

  console.log(
    `${label}: ${duration.toFixed(2)} ms | ` +
    `${throughput.toFixed(0)} rows/sec`
  );

  return duration;
}

async function main() {
  const methods = {
    Sequential: sequentialInsert,
    Batch: batchInsert,
    COPY: copyInsert,
  };

  const results = {
    Sequential: [],
    Batch: [],
    COPY: [],
  };

  try {
    for (let run = 0; run < RUNS; run++) {
      const order = [
        ["Sequential", "Batch", "COPY"],
        ["COPY", "Batch", "Sequential"],
        ["Batch", "Sequential", "COPY"],
      ][run];

      console.log(`\n--- Run ${run + 1} of ${RUNS} ---`);

      for (const name of order) {
        await cleanup();

        const duration = await measure(name, methods[name]);
        results[name].push(duration);
      }
    }

    const average = (values) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const averages = Object.fromEntries(
      Object.entries(results).map(([name, times]) => [
        name,
        average(times),
      ])
    );

    console.log("\n--- Average Results ---");

    for (const [name, duration] of Object.entries(averages)) {
      console.log(
        `${name}: ${duration.toFixed(2)} ms | ` +
        `${(ROW_COUNT / duration * 1000).toFixed(0)} rows/sec`
      );
    }

    console.log("\n--- Relative Speedup ---");

    for (const name of ["Batch", "COPY"]) {
      console.log(
        `${name} vs Sequential: ` +
        `${(averages.Sequential / averages[name]).toFixed(2)}x`
      );
    }
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