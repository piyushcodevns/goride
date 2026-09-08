require("dotenv").config();

const logger = require("./src/utils/logger");

// ===============================
// Environment Validation
// ===============================

const requiredEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_2FA_ENCRYPTION_KEY",
  "OPENROUTESERVICE_API_KEY",
];

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
const prisma = require("./src/config/prisma");
const { closeRedisConnection } = require("./src/config/redis");
const { ensureBackupSchedule } = require("./src/queues/backup.queue");
const { createWorker } = require("./src/workers/notification.worker");

const PORT = process.env.PORT || 5000;

const notificationWorkers = [];

try {
  notificationWorkers.push(createWorker("notification"));
  notificationWorkers.push(createWorker("notification-scheduled"));
} catch (error) {
  logger.warn("Notification workers could not be started.", {
    error: error.message,
  });
}

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
// Graceful Shutdown Handler
// ===============================

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info(`${signal} received. Initiating graceful shutdown...`);

  // Safety timeout to prevent hanging during shutdown
  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10000);

  if (forceExitTimer && typeof forceExitTimer.unref === "function") {
    forceExitTimer.unref();
  }

  try {
    // 1. Stop receiving new HTTP connections
    await new Promise((resolve) => {
      server.close((err) => {
        if (err) {
          logger.warn("HTTP server close encountered an error:", { error: err.message });
        } else {
          logger.info("HTTP server closed successfully.");
        }
        resolve();
      });
    });

    // 2. Close notification queue workers
    if (notificationWorkers.length > 0) {
      await Promise.allSettled(notificationWorkers.map((worker) => worker.close()));
      logger.info("Notification workers closed.");
    }

    // 3. Disconnect Redis
    await closeRedisConnection();

    // 4. Disconnect Prisma connection pool
    await prisma.$disconnect();
    logger.info("Prisma database pool disconnected.");

    clearTimeout(forceExitTimer);
    logger.info("Graceful shutdown completed. Exiting cleanly.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", { error: error.message });
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

// ===============================
// Unhandled Promise Rejection
// ===============================

process.on("unhandledRejection", (error) => {
  logger.error(`UNHANDLED REJECTION: ${error.stack || error.message}`);
  gracefulShutdown("unhandledRejection");
});

// ===============================
// Process Termination Signals
// ===============================

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { server, gracefulShutdown };
