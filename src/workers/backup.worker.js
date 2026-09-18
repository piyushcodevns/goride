const { Worker } = require("bullmq");
const { redisConnection, isQueueEnabled } = require("../config/redis");
const { BACKUP_QUEUE_NAME } = require("../queues/backup.queue");
const { processBackupJob } = require("../processors/backup.processor");
const logger = require("../utils/logger");

let backupWorkerInstance = null;

const createBackupWorker = () => {
  if (!isQueueEnabled()) {
    logger.info("Backup worker skipped because queueing is disabled.");
    return null;
  }

  if (backupWorkerInstance) {
    return backupWorkerInstance;
  }

  const worker = new Worker(
    BACKUP_QUEUE_NAME,
    async (job) => {
      return processBackupJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    logger.info("Scheduled backup job completed.", {
      jobId: job.id,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error("Scheduled backup job failed.", {
      jobId: job?.id,
      error: String(error?.message || error).slice(0, 500),
    });
  });

  backupWorkerInstance = worker;
  return worker;
};

const getBackupWorker = () => backupWorkerInstance;

const closeBackupWorker = async () => {
  if (backupWorkerInstance) {
    await backupWorkerInstance.close();
    backupWorkerInstance = null;
    logger.info("Backup worker closed.");
  }
};

module.exports = {
  get backupWorker() {
    return getBackupWorker();
  },
  createBackupWorker,
  getBackupWorker,
  closeBackupWorker,
};
