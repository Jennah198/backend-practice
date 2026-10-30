const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("PostgreSQL idle client error:", err);
});

async function connectPostgres() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("PostgreSQL connected");
  } finally {
    client.release();
  }
}

module.exports = { pool, connectPostgres };