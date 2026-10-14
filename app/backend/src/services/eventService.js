
const pool = require("../db");

async function getEvents(limit, offset) {
  const result = await pool.query(
    `SELECT id, user_id, event_name, created_at, country, metadata
     FROM events
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

async function createEvent({ user_id, event_name, country, metadata }) {
  const result = await pool.query(
    `INSERT INTO events
       (user_id, event_name, country, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, event_name, country, metadata]
  );

  return result.rows[0];
}

module.exports = {
  getEvents,
  createEvent,
};
