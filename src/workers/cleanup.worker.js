const { Worker } = require("bullmq");
const { redisConnection, isQueueEnabled } = require("../config/redis");
const { CLEANUP_QUEUE_NAME } = require("../queues/cleanup.queue");
const { processCleanupJob } = require("../processors/cleanup.processor");
const logger = require("../utils/logger");

let cleanupWorkerInstance = null;

const createCleanupWorker = () => {
  if (!isQueueEnabled()) {
    logger.info("Cleanup worker skipped because queueing is disabled.");
    return null;
  }

  if (cleanupWorkerInstance) {
    return cleanupWorkerInstance;
  }

  const worker = new Worker(
    CLEANUP_QUEUE_NAME,
    async (job) => {
      return processCleanupJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 1, // Single execution for cleanup maintenance
      lockDuration: 60000,
    },
  );

  worker.on("completed", (job) => {
    logger.info("Cleanup job completed.", {
      jobId: job.id,
      type: job.data?.type,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Cleanup job failed.", {
      jobId: job?.id,
      type: job?.data?.type,
      error: err?.message,
    });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Cleanup job stalled.", { jobId });
  });

  worker.on("error", (error) => {
    logger.error("Cleanup worker error.", { error: error.message });
  });

  cleanupWorkerInstance = worker;
  return worker;
};

const getCleanupWorker = () => cleanupWorkerInstance;

const closeCleanupWorker = async () => {
  if (cleanupWorkerInstance) {
    await cleanupWorkerInstance.close();
    cleanupWorkerInstance = null;
    logger.info("Cleanup worker closed.");
  }
};

module.exports = {
  createCleanupWorker,
  getCleanupWorker,
  closeCleanupWorker,
};
