const express = require("express");
const pool = require("./db");

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`EventPulse API running on port ${PORT}`);
});