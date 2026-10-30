const { redis } = require("./config/redis");
const { pool } = require("./config/postgres");
const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Redis Arena",
  });
});

app.get("/health", async (req, res) => {
  try {
    const redisStatus = await redis.ping();

    const dbResult = await pool.query(
      "SELECT NOW() AS time"
    );

    res.json({
      status: "ok",
      redis: redisStatus,
      postgres: "connected",
      databaseTime: dbResult.rows[0].time,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: "Dependency health check failed",
    });
  }
});

module.exports = app;