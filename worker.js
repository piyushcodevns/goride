require("dotenv").config();

process.env.WORKER_STANDALONE = "true";

const logger = require("./src/utils/logger");
const prisma = require("./src/config/prisma");
const { closeRedisConnection } = require("./src/config/redis");
const { startAllWorkers, stopAllWorkers } = require("./src/workers");
const { startSchedulers, stopSchedulers } = require("./src/schedulers");
const { closeAllQueues } = require("./src/queues");

// ===============================
// Environment Validation
// ===============================
const requiredEnv = ["DATABASE_URL"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable for worker: ${key}`);
    process.exit(1);
  }
});

// ===============================
// Uncaught Exception
// ===============================
process.on("uncaughtException", (error) => {
  logger.error(`WORKER UNCAUGHT EXCEPTION: ${error.stack || error.message}`);
  process.exit(1);
});

// ===============================
// Start Background Workers & Schedulers
// ===============================
logger.info("=================================");
logger.info("⚙️  GoRide Standalone Worker Starting");
logger.info(`📦 Environment : ${process.env.NODE_ENV || "development"}`);
logger.info("=================================");

startAllWorkers();
startSchedulers().catch((err) => {
  logger.warn("Scheduler failed to start in standalone worker process.", {
    error: err.message,
  });
});

// ===============================
// Graceful Shutdown Handler
// ===============================
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info(`${signal} received. Initiating worker graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Worker graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10000);

  if (forceExitTimer && typeof forceExitTimer.unref === "function") {
    forceExitTimer.unref();
  }

  try {
    // 1. Stop schedulers
    await stopSchedulers();

    // 2. Stop workers (wait for active jobs to finish or fail safely)
    await stopAllWorkers();

    // 3. Close queues
    await closeAllQueues();

    // 4. Close Redis connection
    await closeRedisConnection();

    // 5. Disconnect Prisma
    await prisma.$disconnect();
    logger.info("Worker database connection disconnected.");

    clearTimeout(forceExitTimer);
    logger.info("Worker process graceful shutdown completed. Exiting cleanly.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during worker graceful shutdown:", { error: error.message });
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => {
  logger.error(`WORKER UNHANDLED REJECTION: ${error.stack || error.message}`);
  gracefulShutdown("unhandledRejection");
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { gracefulShutdown };
