const pool = require("../src/db");
const { from: copyFrom } = require("pg-copy-streams");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { performance } = require("node:perf_hooks");

const ROW_COUNT = 1000;

function* generateRows(count) {
  for (let i = 0; i < count; i++) {
    const userId = Math.floor(Math.random() * 10000) + 1;

    const metadata = JSON.stringify({
      source: "copy_generator",
      device: "desktop",
    });

    // CSV fields are quoted and internal quotes escaped.
    const csvMetadata = `"${metadata.replace(/"/g, '""')}"`;

    yield `${userId},page_view,Ethiopia,${csvMetadata}\n`;
  }
}

async function main() {
  const client = await pool.connect();

  try {
    const start = performance.now();

    const copyStream = client.query(
      copyFrom(`
        COPY events (user_id, event_name, country, metadata)
        FROM STDIN WITH (FORMAT csv)
      `)
    );

    await pipeline(
      Readable.from(generateRows(ROW_COUNT)),
      copyStream
    );

    const duration = performance.now() - start;

    console.log(`Inserted ${ROW_COUNT} events using COPY`);
    console.log(`Duration: ${duration.toFixed(2)} ms`);
    console.log(
      `Throughput: ${(ROW_COUNT / duration * 1000).toFixed(0)} rows/sec`
    );
  } catch (error) {
    console.error("COPY failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();