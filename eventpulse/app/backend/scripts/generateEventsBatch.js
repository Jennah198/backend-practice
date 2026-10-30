const pool = require("../src/db");

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

async function insertBatch(count) {
  const values = [];
  const placeholders = [];

  for (let i = 0; i < count; i++) {
    const userId = Math.floor(Math.random() * 10000) + 1;
    const eventName = randomItem(eventNames);
    const country = randomItem(countries);

    const metadata = JSON.stringify({
      source: "batch_generator",
      device: randomItem(devices),
    });

    const position = i * 4;

    placeholders.push(
      `($${position + 1}, $${position + 2}, $${position + 3}, $${position + 4})`
    );

    values.push(userId, eventName, country, metadata);
  }

  const query = `
    INSERT INTO events (user_id, event_name, country, metadata)
    VALUES ${placeholders.join(", ")}
  `;

  await pool.query(query, values);
}

async function main() {
  const count = 100;

  try {
    console.time("Batch insertion");

    await insertBatch(count);

    console.timeEnd("Batch insertion");
    console.log(`Successfully inserted ${count} events`);
  } catch (error) {
    console.error("Batch insertion failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();