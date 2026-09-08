const { Queue } = require("bullmq");
const { redisConnection, isQueueEnabled, connectRedisIfNeeded } = require("../config/redis");
const logger = require("../utils/logger");

const BACKUP_QUEUE_NAME = "backup";

let backupQueueInstance = null;

const getBackupQueue = () => {
  if (!isQueueEnabled()) {
    return null;
  }
  if (!backupQueueInstance) {
    backupQueueInstance = new Queue(BACKUP_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000,
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
  return backupQueueInstance;
};

const ensureBackupSchedule = async () => {
  if (process.env.BACKUP_SCHEDULE_ENABLED !== "true" || !isQueueEnabled()) {
    return false;
  }

  try {
    await connectRedisIfNeeded();
    const queue = getBackupQueue();
    if (!queue) {
      return false;
    }

    await queue.upsertJobScheduler(
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

    logger.info("Backup schedule registered successfully.");
    return true;
  } catch (error) {
    logger.error("Failed to register backup schedule.", { error: error.message });
    return false;
  }
};

const closeBackupQueue = async () => {
  if (backupQueueInstance) {
    await backupQueueInstance.close();
    backupQueueInstance = null;
    logger.info("Backup queue closed.");
  }
};

module.exports = {
  BACKUP_QUEUE_NAME,
  get backupQueue() {
    return getBackupQueue();
  },
  getBackupQueue,
  ensureBackupSchedule,
  closeBackupQueue,
};

