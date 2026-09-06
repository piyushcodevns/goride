const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");

const BACKUP_QUEUE_NAME = "backup";

const backupQueue = new Queue(BACKUP_QUEUE_NAME, {
  connection: redisConnection,
});

const ensureBackupSchedule = async () => {
  if (process.env.BACKUP_SCHEDULE_ENABLED !== "true") {
    return false;
  }

  await backupQueue.upsertJobScheduler(
    "daily-backup",
    {
      pattern: process.env.BACKUP_CRON || "0 2 * * *",
    },
    {
      name: "scheduled-backup",
      data: {
        type: "SCHEDULED",
      },
      opts: {
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    },
  );

  return true;
};

const closeBackupQueue = async () => {
  await backupQueue.close();
};

module.exports = {
  BACKUP_QUEUE_NAME,
  backupQueue,
  ensureBackupSchedule,
  closeBackupQueue,
};

