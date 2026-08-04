require("dotenv").config();

const logger = require("./src/utils/logger");

// ===============================
// Environment Validation
// ===============================

const requiredEnv = ["OPENROUTESERVICE_API_KEY"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);

    process.exit(1);
  }
});

// ===============================
// Uncaught Exception
// ===============================

process.on("uncaughtException", (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.stack || error.message}`);

  process.exit(1);
});

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// ===============================
// Start Server
// ===============================

const server = app.listen(PORT, () => {
  logger.info("=================================");
  logger.info("🚀 GoRide Backend Started");
  logger.info(`🌐 Server : http://localhost:${PORT}`);
  logger.info(`📦 Environment : ${process.env.NODE_ENV || "development"}`);
  logger.info("=================================");
});

// ===============================
// Unhandled Promise Rejection
// ===============================

process.on("unhandledRejection", (error) => {
  logger.error(`UNHANDLED REJECTION: ${error.stack || error.message}`);

  server.close(() => {
    process.exit(1);
  });
});

// ===============================
// Graceful Shutdown
// ===============================

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down server...");

  server.close(() => {
    logger.info("Server closed successfully.");

    process.exit(0);
  });
});
