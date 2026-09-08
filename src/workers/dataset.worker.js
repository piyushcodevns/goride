const { Worker } = require("bullmq");
const { redisConnection, isQueueEnabled } = require("../config/redis");
const { DATASET_QUEUE_NAME } = require("../queues/dataset.queue");
const { processDatasetJob } = require("../processors/dataset.processor");
const logger = require("../utils/logger");

let datasetWorkerInstance = null;

const createDatasetWorker = () => {
  if (!isQueueEnabled()) {
    logger.info("Dataset worker skipped because queueing is disabled.");
    return null;
  }

  if (datasetWorkerInstance) {
    return datasetWorkerInstance;
  }

  const worker = new Worker(
    DATASET_QUEUE_NAME,
    async (job) => {
      return processDatasetJob(job);
    },
    {
      connection: redisConnection,
      concurrency: Number(process.env.DATASET_CONCURRENCY) || 5,
      lockDuration: 30000,
    },
  );

  worker.on("completed", (job) => {
    logger.info("Dataset job completed.", {
      jobId: job.id,
      rideId: job.data?.rideId,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Dataset job failed.", {
      jobId: job?.id,
      rideId: job?.data?.rideId,
      error: err?.message,
    });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Dataset job stalled.", { jobId });
  });

  worker.on("error", (error) => {
    logger.error("Dataset worker error.", { error: error.message });
  });

  datasetWorkerInstance = worker;
  return worker;
};

const getDatasetWorker = () => datasetWorkerInstance;

const closeDatasetWorker = async () => {
  if (datasetWorkerInstance) {
    await datasetWorkerInstance.close();
    datasetWorkerInstance = null;
    logger.info("Dataset worker closed.");
  }
};

module.exports = {
  createDatasetWorker,
  getDatasetWorker,
  closeDatasetWorker,
};
