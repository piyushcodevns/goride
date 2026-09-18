const {
  createWorker: createNotificationWorker,
  getWorkerStatus: getNotificationWorkerStatus,
} = require("./notification.worker");

const {
  createScheduledRideWorker,
  closeScheduledRideWorker,
  getScheduledRideWorker,
} = require("./scheduledRide.worker");

const {
  createCleanupWorker,
  closeCleanupWorker,
  getCleanupWorker,
} = require("./cleanup.worker");

const {
  createDatasetWorker,
  closeDatasetWorker,
  getDatasetWorker,
} = require("./dataset.worker");

const {
  createBackupWorker,
  closeBackupWorker,
  getBackupWorker,
} = require("./backup.worker");

const { isQueueEnabled } = require("../config/redis");
const logger = require("../utils/logger");

const activeWorkers = [];

const startAllWorkers = () => {
  if (!isQueueEnabled()) {
    logger.info("Queue is disabled. Skipping worker startup.");
    return [];
  }

  logger.info("Starting GoRide background workers...");

  try {
    const notifDefault = createNotificationWorker("notification");
    if (notifDefault) activeWorkers.push(notifDefault);

    const notifScheduled = createNotificationWorker("notification-scheduled");
    if (notifScheduled) activeWorkers.push(notifScheduled);

    const scheduledRideWorker = createScheduledRideWorker();
    if (scheduledRideWorker) activeWorkers.push(scheduledRideWorker);

    const cleanupWorker = createCleanupWorker();
    if (cleanupWorker) activeWorkers.push(cleanupWorker);

    const datasetWorker = createDatasetWorker();
    if (datasetWorker) activeWorkers.push(datasetWorker);

    const backupWorker = createBackupWorker();
    if (backupWorker) activeWorkers.push(backupWorker);

    logger.info("GoRide background workers started successfully.", {
      activeCount: activeWorkers.length,
    });
  } catch (error) {
    logger.error("Error starting background workers.", { error: error.message });
  }

  return activeWorkers;
};

const stopAllWorkers = async () => {
  logger.info("Stopping all background workers...");
  await Promise.allSettled([
    ...activeWorkers.map((worker) => worker.close()),
    closeScheduledRideWorker(),
    closeCleanupWorker(),
    closeDatasetWorker(),
    closeBackupWorker(),
  ]);
  activeWorkers.length = 0;
  logger.info("All background workers stopped cleanly.");
};

const getAllWorkerStatus = () => {
  const notifStatus = getNotificationWorkerStatus();
  const additional = [
    {
      queueName: "scheduled-rides",
      worker: getScheduledRideWorker(),
    },
    {
      queueName: "cleanup",
      worker: getCleanupWorker(),
    },
    {
      queueName: "dataset",
      worker: getDatasetWorker(),
    },
    {
      queueName: "backup",
      worker: getBackupWorker(),
    },
  ].map(({ queueName, worker }) => ({
    queueName,
    status: worker && worker.isRunning() ? "RUNNING" : "STOPPED",
    running: Boolean(worker && worker.isRunning()),
  }));

  return [...notifStatus, ...additional];
};

module.exports = {
  startAllWorkers,
  stopAllWorkers,
  getAllWorkerStatus,
  createNotificationWorker,
  createScheduledRideWorker,
  createCleanupWorker,
  createDatasetWorker,
  createBackupWorker,
};
