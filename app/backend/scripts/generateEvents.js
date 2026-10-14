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

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function generateEvents(count) {
  try {
    for (let i = 0; i < count; i++) {
      const userId = Math.floor(Math.random() * 10000) + 1;
      const eventName = randomItem(eventNames);
      const country = randomItem(countries);

      const metadata = {
        source: "data_generator",
        device: randomItem(["mobile", "desktop", "tablet"]),
      };

      await pool.query(
        `INSERT INTO events (user_id, event_name, country, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, eventName, country, metadata]
      );
    }

    console.log(`Successfully generated ${count} events`);
  } catch (error) {
    console.error("Data generation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

generateEvents(100);