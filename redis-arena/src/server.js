require("dotenv").config();

const app = require("./app");
const { connectRedis } = require("./config/redis");
const { connectPostgres } = require("./config/postgres");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectRedis();
    await connectPostgres();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();