const { Queue } = require("bullmq");
const { redisConnection, isQueueEnabled, connectRedisIfNeeded } = require("../config/redis");
const logger = require("../utils/logger");

const DATASET_QUEUE_NAME = "dataset";

let datasetQueueInstance = null;

const getDatasetQueue = () => {
  if (!isQueueEnabled()) {
    return null;
  }
  if (!datasetQueueInstance) {
    datasetQueueInstance = new Queue(DATASET_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
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
  return datasetQueueInstance;
};

/**
 * Enqueue an asynchronous ride event job for AI dataset collection.
 * @param {Object} payload
 * @param {string} payload.rideId - Required authoritative ride ID
 * @param {string} [payload.eventType="RIDE_COMPLETED"]
 * @param {Object} [options]
 */
const addRideDatasetJob = async (payload = {}, options = {}) => {
  const { rideId, eventType = "RIDE_COMPLETED" } = payload;
  if (!rideId) {
    throw new Error("rideId is required to enqueue dataset job.");
  }

  if (!isQueueEnabled()) {
    logger.info("Dataset queue is disabled. Job skipped.", { rideId });
    return null;
  }

  try {
    await connectRedisIfNeeded();
    const queue = getDatasetQueue();
    if (!queue) {
      throw new Error("Dataset queue instance unavailable.");
    }

    const job = await queue.add(
      "extract-ride-dataset",
      { rideId, eventType },
      {
        jobId: `dataset-${eventType}-${rideId}`, // Deduplication per event per ride
        ...options,
      },
    );

    logger.info("Ride dataset job enqueued.", {
      jobId: job.id,
      rideId,
      eventType,
    });

    return job;
  } catch (error) {
    logger.error("Failed to enqueue ride dataset job.", {
      rideId,
      error: error.message,
    });
    throw error;
  }
};

const closeDatasetQueue = async () => {
  if (datasetQueueInstance) {
    await datasetQueueInstance.close();
    datasetQueueInstance = null;
    logger.info("Dataset queue closed.");
  }
};

module.exports = {
  DATASET_QUEUE_NAME,
  getDatasetQueue,
  addRideDatasetJob,
  closeDatasetQueue,
};
