const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");
const {
  BACKUP_QUEUE_NAME,
} = require("../queues/backup.queue");
const backupService = require("../services/admin/adminBackup.service");
const logger = require("../utils/logger");

const backupWorker = new Worker(
  BACKUP_QUEUE_NAME,
  async (job) => {
    if (job.name !== "scheduled-backup") {
      throw new Error("Unknown backup job.");
    }

    const backup = await backupService.createBackup({
      adminId: null,
      type: "SCHEDULED",
    });

    await backupService.cleanupExpiredBackups();

    return {
      id: backup.id,
      filename: backup.filename,
      status: backup.status,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

backupWorker.on("completed", (job) => {
  logger.info("Scheduled backup job completed.", {
    jobId: job.id,
  });
});

backupWorker.on("failed", (job, error) => {
  logger.error("Scheduled backup job failed.", {
    jobId: job?.id,
    error: String(error?.message || error).slice(0, 500),
  });
});

const closeBackupWorker = async () => {
  await backupWorker.close();
};

module.exports = {
  backupWorker,
  closeBackupWorker,
};
