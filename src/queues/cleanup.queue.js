const { Queue } = require("bullmq");
const { redisConnection, isQueueEnabled, connectRedisIfNeeded } = require("../config/redis");
const logger = require("../utils/logger");

const CLEANUP_QUEUE_NAME = "cleanup";

let cleanupQueueInstance = null;

const getCleanupQueue = () => {
  if (!isQueueEnabled()) {
    return null;
  }
  if (!cleanupQueueInstance) {
    cleanupQueueInstance = new Queue(CLEANUP_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 15000,
        },
        removeOnComplete: {
          age: 86400,
          count: 50,
        },
        removeOnFail: {
          age: 604800,
          count: 100,
        },
      },
    });
  }
  return cleanupQueueInstance;
};

/**
 * Enqueue a maintenance cleanup job.
 * @param {string} [type="full"] - "full", "sessions", "tokens", "backups", "notifications"
 * @param {Object} [options]
 */
const addCleanupJob = async (type = "full", options = {}) => {
  if (!isQueueEnabled()) {
    logger.info("Cleanup queue is disabled. Job skipped.", { type });
    return null;
  }

  try {
    await connectRedisIfNeeded();
    const queue = getCleanupQueue();
    if (!queue) {
      throw new Error("Cleanup queue instance unavailable.");
    }

    const job = await queue.add(
      "system-cleanup",
      { type, requestedAt: Date.now() },
      {
        jobId: `cleanup-${type}-${Math.floor(Date.now() / 60000)}`, // Deduplicate within 1 minute
        ...options,
      },
    );

    logger.info("System cleanup job enqueued.", {
      jobId: job.id,
      type,
    });

    return job;
  } catch (error) {
    logger.error("Failed to enqueue cleanup job.", {
      type,
      error: error.message,
    });
    throw error;
  }
};

const closeCleanupQueue = async () => {
  if (cleanupQueueInstance) {
    await cleanupQueueInstance.close();
    cleanupQueueInstance = null;
    logger.info("Cleanup queue closed.");
  }
};

module.exports = {
  CLEANUP_QUEUE_NAME,
  getCleanupQueue,
  addCleanupJob,
  closeCleanupQueue,
};
