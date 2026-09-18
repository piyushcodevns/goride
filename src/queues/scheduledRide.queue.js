const { Queue } = require("bullmq");
const { redisConnection, isQueueEnabled, connectRedisIfNeeded } = require("../config/redis");
const logger = require("../utils/logger");

const SCHEDULED_RIDE_QUEUE_NAME = "scheduled-rides";

let scheduledRideQueueInstance = null;

const getScheduledRideQueue = () => {
  if (!isQueueEnabled()) {
    return null;
  }
  if (!scheduledRideQueueInstance) {
    scheduledRideQueueInstance = new Queue(SCHEDULED_RIDE_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 5000,
        },
      },
    });
  }
  return scheduledRideQueueInstance;
};

/**
 * Enqueue a scheduled ride activation job.
 * @param {Object} payload
 * @param {string} payload.rideId - Required authoritative ride ID
 * @param {Date|string} [payload.scheduledFor] - Scheduled pickup time
 * @param {Object} [options] - Optional BullMQ options
 */
const addScheduledRideActivationJob = async (payload = {}, options = {}) => {
  const { rideId, scheduledFor } = payload;
  if (!rideId) {
    throw new Error("rideId is required to enqueue scheduled ride activation.");
  }

  if (!isQueueEnabled()) {
    logger.info("Scheduled ride queue is disabled. Job skipped.", { rideId });
    return null;
  }

  try {
    await connectRedisIfNeeded();
    const queue = getScheduledRideQueue();
    if (!queue) {
      throw new Error("Scheduled ride queue instance unavailable.");
    }

    let delay = 0;
    if (scheduledFor) {
      const scheduledTime = new Date(scheduledFor).getTime();
      const leadTimeMs = 15 * 60 * 1000; // 15 minutes before pickup
      delay = Math.max(0, scheduledTime - leadTimeMs - Date.now());
    }

    const jobOptions = {
      jobId: `activate-ride-${rideId}`, // Deduplication per ride
      delay,
      ...options,
    };

    const job = await queue.add(
      "activate-scheduled-ride",
      { rideId },
      jobOptions,
    );

    logger.info("Scheduled ride activation job enqueued.", {
      jobId: job.id,
      rideId,
      delayMs: delay,
    });

    return job;
  } catch (error) {
    logger.error("Failed to enqueue scheduled ride activation job.", {
      rideId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Enqueue a scheduled ride sweep job to check and activate any due rides.
 */
const addScheduledRideSweepJob = async () => {
  if (!isQueueEnabled()) {
    return null;
  }

  try {
    await connectRedisIfNeeded();
    const queue = getScheduledRideQueue();
    if (!queue) {
      return null;
    }

    const job = await queue.add(
      "sweep-scheduled-rides",
      { timestamp: Date.now() },
      {
        jobId: `sweep-scheduled-rides-${Math.floor(Date.now() / 60000)}`, // Deduplication within 1 minute window
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    return job;
  } catch (error) {
    logger.error("Failed to enqueue scheduled ride sweep job.", {
      error: error.message,
    });
    return null;
  }
};

const closeScheduledRideQueue = async () => {
  if (scheduledRideQueueInstance) {
    await scheduledRideQueueInstance.close();
    scheduledRideQueueInstance = null;
    logger.info("Scheduled ride queue closed.");
  }
};

module.exports = {
  SCHEDULED_RIDE_QUEUE_NAME,
  getScheduledRideQueue,
  addScheduledRideActivationJob,
  addScheduledRideSweepJob,
  closeScheduledRideQueue,
};
