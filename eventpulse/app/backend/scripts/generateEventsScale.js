const pool = require("../src/db");
const { from: copyFrom } = require("pg-copy-streams");
const { Readable } = require("node:stream");
const { performance } = require("node:perf_hooks");

const targetRows = Number(process.argv[2] || 5000);

const eventNames = [
  "user_signup",
  "page_view",
  "button_click",
  "login",
  "purchase",
];

const countries = [
  "Ethiopia",
  "Kenya",
  "Nigeria",
  "USA",
  "India",
];

const devices = ["mobile", "desktop", "tablet"];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function csvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function* generateRows(count) {
  for (let i = 0; i < count; i++) {
    const userId = Math.floor(Math.random() * 10000) + 1;
    const eventName = randomItem(eventNames);
    const country = randomItem(countries);

    const metadata = JSON.stringify({
      source: "scale_generator",
      device: randomItem(devices),
    });

    yield [
      userId,
      eventName,
      country,
      metadata,
    ].map(csvField).join(",") + "\n";
  }
}

async function main() {
  if (!Number.isSafeInteger(targetRows) || targetRows < 1) {
    throw new Error("Target rows must be a positive safe integer");
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT COUNT(*) FROM events"
    );

    const currentRows = Number(result.rows[0].count);

    if (targetRows <= currentRows) {
      console.log(`Current rows: ${currentRows}`);
      console.log(`Target already reached: ${targetRows}`);
      return;
    }

    const rowsToInsert = targetRows - currentRows;

    console.log(`Current rows: ${currentRows}`);
    console.log(`Target rows: ${targetRows}`);
    console.log(`Rows to insert: ${rowsToInsert}`);

    const start = performance.now();

    const copyStream = client.query(
    copyFrom(`
        COPY events (user_id, event_name, country, metadata)
        FROM STDIN WITH (FORMAT csv)
    `)
    );

    await new Promise((resolve, reject) => {
    const source = Readable.from(generateRows(rowsToInsert));

    source.on("error", reject);
    copyStream.on("error", reject);
    copyStream.on("finish", resolve);

    source.pipe(copyStream);
    });

    const duration = performance.now() - start;

    const verification = await client.query(
      "SELECT COUNT(*) FROM events"
    );

    console.log(`Final rows: ${verification.rows[0].count}`);
    console.log(`Inserted: ${rowsToInsert}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(
      `Throughput: ${Math.round(rowsToInsert / (duration / 1000))} rows/sec`
    );
  } catch (error) {
    console.error("Scale generation failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});