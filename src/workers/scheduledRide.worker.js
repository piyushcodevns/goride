const { Worker } = require("bullmq");
const { redisConnection, isQueueEnabled } = require("../config/redis");
const { SCHEDULED_RIDE_QUEUE_NAME } = require("../queues/scheduledRide.queue");
const { processScheduledRideJob } = require("../processors/scheduledRide.processor");
const logger = require("../utils/logger");

let scheduledRideWorkerInstance = null;

const createScheduledRideWorker = () => {
  if (!isQueueEnabled()) {
    logger.info("Scheduled ride worker skipped because queueing is disabled.");
    return null;
  }

  if (scheduledRideWorkerInstance) {
    return scheduledRideWorkerInstance;
  }

  const worker = new Worker(
    SCHEDULED_RIDE_QUEUE_NAME,
    async (job) => {
      return processScheduledRideJob(job);
    },
    {
      connection: redisConnection,
      concurrency: Number(process.env.SCHEDULED_RIDE_CONCURRENCY) || 5,
      lockDuration: 30000,
    },
  );

  worker.on("completed", (job) => {
    logger.info("Scheduled ride job completed.", {
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Scheduled ride job failed.", {
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      maxAttempts: job?.opts?.attempts,
      error: err?.message,
    });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Scheduled ride job stalled.", { jobId });
  });

  worker.on("error", (error) => {
    logger.error("Scheduled ride worker error.", { error: error.message });
  });

  scheduledRideWorkerInstance = worker;
  return worker;
};

const getScheduledRideWorker = () => scheduledRideWorkerInstance;

const closeScheduledRideWorker = async () => {
  if (scheduledRideWorkerInstance) {
    await scheduledRideWorkerInstance.close();
    scheduledRideWorkerInstance = null;
    logger.info("Scheduled ride worker closed.");
  }
};

module.exports = {
  createScheduledRideWorker,
  getScheduledRideWorker,
  closeScheduledRideWorker,
};
