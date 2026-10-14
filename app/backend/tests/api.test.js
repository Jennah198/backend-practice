
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");
const pool = require("../src/db");

test("GET /health returns a healthy status", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.body.databaseTime);
});

test("GET /api/events returns paginated data", async () => {
  const response = await request(app)
    .get("/api/events?limit=10&offset=0");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.equal(response.body.pagination.limit, 10);
  assert.equal(response.body.pagination.offset, 0);
});

test("GET /api/events rejects an invalid limit", async () => {
  const response = await request(app)
    .get("/api/events?limit=500");

  assert.equal(response.status, 400);
  assert.match(response.body.error, /limit/i);
});

test("POST /api/events creates an event", async () => {
  let createdId;

  try {
    const response = await request(app)
      .post("/api/events")
      .send({
        user_id: 7,
        event_name: "automated_test_event",
        country: "Ethiopia",
        metadata: {
          source: "automated_test",
        },
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.event_name, "automated_test_event");
    assert.ok(response.body.data.id);

    createdId = response.body.data.id;

    const stored = await pool.query(
      "SELECT id FROM events WHERE id = $1",
      [createdId]
    );

    assert.equal(stored.rowCount, 1);
  } finally {
    if (createdId !== undefined) {
      await pool.query(
        "DELETE FROM events WHERE id = $1",
        [createdId]
      );
    }
  }
});

test("POST /api/events rejects invalid data", async () => {
  const response = await request(app)
    .post("/api/events")
    .send({
      user_id: -1,
      event_name: "",
    });

  assert.equal(response.status, 400);
});

test.after(async () => {
  await pool.end();
});
