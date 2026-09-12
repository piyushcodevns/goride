const { getScheduledRideQueue } = require("../queues/scheduledRide.queue");
const { getCleanupQueue } = require("../queues/cleanup.queue");
const { ensureBackupSchedule } = require("../queues/backup.queue");
const { isQueueEnabled, connectRedisIfNeeded } = require("../config/redis");
const logger = require("../utils/logger");

let schedulersStarted = false;

/**
 * Register repeatable job schedulers in BullMQ.
 * Uses BullMQ's native upsertJobScheduler() which enforces multi-instance safety
 * and prevents duplicate job execution across multiple app/worker instances.
 */
const startSchedulers = async () => {
  if (!isQueueEnabled()) {
    logger.info("Scheduler skipped because queueing is disabled.");
    return false;
  }

  try {
    await connectRedisIfNeeded();

    // 1. Scheduled Rides Sweep (every minute)
    if (process.env.SCHEDULED_RIDES_SCHEDULE_ENABLED !== "false") {
      const scheduledRideQueue = getScheduledRideQueue();
      if (scheduledRideQueue) {
        await scheduledRideQueue.upsertJobScheduler(
          "scheduled-rides-sweep",
          {
            pattern: process.env.SCHEDULED_RIDES_CRON || "* * * * *",
          },
          {
            name: "sweep-scheduled-rides",
            data: { scheduledBy: "bullmq-scheduler" },
            opts: {
              removeOnComplete: 20,
              removeOnFail: 50,
            },
          },
        );
        logger.info("Registered scheduled-rides-sweep job scheduler.");
      }
    }

    // 2. System Maintenance Cleanup (daily at 3 AM)
    if (process.env.CLEANUP_SCHEDULE_ENABLED !== "false") {
      const cleanupQueue = getCleanupQueue();
      if (cleanupQueue) {
        await cleanupQueue.upsertJobScheduler(
          "daily-cleanup",
          {
            pattern: process.env.CLEANUP_CRON || "0 3 * * *",
          },
          {
            name: "system-cleanup",
            data: { type: "full" },
            opts: {
              removeOnComplete: 20,
              removeOnFail: 50,
            },
          },
        );
        logger.info("Registered daily-cleanup job scheduler.");
      }
    }

    // 3. Daily Database Backup
    await ensureBackupSchedule();

    schedulersStarted = true;
    logger.info("All BullMQ job schedulers successfully registered.");
    return true;
  } catch (error) {
    logger.error("Failed to register BullMQ job schedulers.", {
      error: error.message,
    });
    return false;
  }
};

const stopSchedulers = async () => {
  schedulersStarted = false;
  logger.info("BullMQ job schedulers stopped.");
};

const isSchedulersStarted = () => schedulersStarted;

module.exports = {
  startSchedulers,
  stopSchedulers,
  isSchedulersStarted,
};
