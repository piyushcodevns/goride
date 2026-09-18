const notificationRepository = require("../repositories/notification.repository");
const { deliverNotification } = require("../services/notification/delivery.service");
const logger = require("../utils/logger");
const { NOTIFICATION_STATUS } = require("../constants/notification.constants");
const {
  findCampaignRecipientByNotificationId,
  updateCampaignRecipient,
} = require("../repositories/admin/adminNotification.repository");

/**
 * Process a notification job.
 * Ensures strict idempotency: if already SENT, skips duplicate delivery.
 * Authoritative data is fetched directly from database using notificationId.
 */
const processNotificationJob = async (job) => {
  const { notificationId } = job.data || {};

  if (!notificationId) {
    throw new Error("Notification ID is required for processing.");
  }

  const notification = await notificationRepository.findNotificationById(notificationId);

  if (!notification) {
    throw new Error(`Notification ${notificationId} not found.`);
  }

  // Idempotency check: avoid duplicate delivery
  if (notification.status === NOTIFICATION_STATUS.SENT) {
    logger.info("Notification already sent. Skipping duplicate delivery.", {
      notificationId: notification.id,
      jobId: job.id,
    });
    return {
      success: true,
      notificationId: notification.id,
      idempotent: true,
    };
  }

  // Mark notification as processing
  await notificationRepository.updateNotificationStatus(
    notification.id,
    NOTIFICATION_STATUS.PROCESSING,
  );

  logger.info("Notification job started.", {
    notificationId: notification.id,
    queueName: job.queueName,
    jobId: job.id,
    attempt: (job.attemptsMade || 0) + 1,
  });

  // Perform actual delivery (re-throws on failure to trigger BullMQ retry)
  await deliverNotification(notification);

  // Delivery succeeded -> update status to SENT
  await notificationRepository.updateNotificationStatus(
    notification.id,
    NOTIFICATION_STATUS.SENT,
  );

  const campaignRecipient = await findCampaignRecipientByNotificationId(notification.id);
  if (campaignRecipient) {
    await updateCampaignRecipient(campaignRecipient.id, {
      status: "SENT",
      errorMessage: null,
    });
  }

  logger.info("Notification job completed.", {
    notificationId: notification.id,
    queueName: job.queueName,
    jobId: job.id,
  });

  return {
    success: true,
    notificationId: notification.id,
  };
};

module.exports = {
  processNotificationJob,
};
