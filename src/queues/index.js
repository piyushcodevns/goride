const {
  notificationQueue,
  retryQueue,
  scheduledQueue,
  deadLetterQueue,
  addNotificationJob,
  getQueueHealth,
  closeQueues: closeNotificationQueues,
} = require("./notification.queue");

const {
  BACKUP_QUEUE_NAME,
  getBackupQueue,
  ensureBackupSchedule,
  closeBackupQueue,
} = require("./backup.queue");

const {
  SCHEDULED_RIDE_QUEUE_NAME,
  getScheduledRideQueue,
  addScheduledRideActivationJob,
  addScheduledRideSweepJob,
  closeScheduledRideQueue,
} = require("./scheduledRide.queue");

const {
  CLEANUP_QUEUE_NAME,
  getCleanupQueue,
  addCleanupJob,
  closeCleanupQueue,
} = require("./cleanup.queue");

const {
  DATASET_QUEUE_NAME,
  getDatasetQueue,
  addRideDatasetJob,
  closeDatasetQueue,
} = require("./dataset.queue");

const logger = require("../utils/logger");

const closeAllQueues = async () => {
  logger.info("Closing all background queues...");
  await Promise.allSettled([
    closeNotificationQueues(),
    closeBackupQueue(),
    closeScheduledRideQueue(),
    closeCleanupQueue(),
    closeDatasetQueue(),
  ]);
  logger.info("All background queues closed cleanly.");
};

module.exports = {
  // Notification
  notificationQueue,
  retryQueue,
  scheduledQueue,
  deadLetterQueue,
  addNotificationJob,
  getQueueHealth,

  // Backup
  BACKUP_QUEUE_NAME,
  getBackupQueue,
  ensureBackupSchedule,

  // Scheduled Rides
  SCHEDULED_RIDE_QUEUE_NAME,
  getScheduledRideQueue,
  addScheduledRideActivationJob,
  addScheduledRideSweepJob,

  // Cleanup
  CLEANUP_QUEUE_NAME,
  getCleanupQueue,
  addCleanupJob,

  // Dataset
  DATASET_QUEUE_NAME,
  getDatasetQueue,
  addRideDatasetJob,

  // Central Management
  closeAllQueues,
};
