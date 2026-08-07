const notificationRepository = require("../repositories/notification.repository");
const {
  ValidationError,
  NotificationNotFoundError,
  ForbiddenError,
} = require("../utils/AppError");

const logger = require("../utils/logger");
const { addNotificationJob } = require("../queues/notification.queue");
const { deliverNotification } = require("./notification/delivery.service");
const { canRetry, getRetryDelay } = require("./notification/retry.service");

const {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY,
} = require("../constants/notification.constants");

const createNotification = async (data) => {
  if (!data.userId) {
    throw new ValidationError("User ID is required.");
  }

  if (!data.title?.trim()) {
    throw new ValidationError("Notification title is required.");
  }

  if (!data.message?.trim()) {
    throw new ValidationError("Notification message is required.");
  }

  return notificationRepository.createNotification({
    userId: data.userId,
    title: data.title.trim(),
    message: data.message.trim(),
    type: data.type || NOTIFICATION_TYPES.SYSTEM,
    channel: data.channel || NOTIFICATION_CHANNELS.IN_APP,
    status: NOTIFICATION_STATUS.PENDING,
    priority: data.priority || NOTIFICATION_PRIORITY.NORMAL,
    metadata: data.metadata || null,
  });
};

const dispatchNotification = async (data) => {
  let notification;

  try {
    notification = await createNotification(data);

    await notificationRepository.updateNotificationStatus(
      notification.id,
      NOTIFICATION_STATUS.PROCESSING,
    );

    try {
      await addNotificationJob({
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        channel: notification.channel,
        type: notification.type,
        priority: notification.priority,
        metadata: notification.metadata,
      });

      logger.info("Notification queued for processing.", {
        notificationId: notification.id,
      });
    } catch (queueError) {
      logger.warn("Queue unavailable, falling back to synchronous delivery.", {
        notificationId: notification.id,
        error: queueError.message,
      });

      await deliverNotification(notification);
      await notificationRepository.updateNotificationStatus(
        notification.id,
        NOTIFICATION_STATUS.SENT,
      );
    }

    return await notificationRepository.findNotificationById(notification.id);
  } catch (error) {
    logger.error("Notification dispatch failed.", {
      error: error.message,
      stack: error.stack,
    });

    if (notification?.id) {
      await notificationRepository.incrementRetryCount(notification.id);

      const latest = await notificationRepository.findNotificationById(
        notification.id,
      );

      if (canRetry(latest.retryCount)) {
        logger.warn("Notification retry scheduled.", {
          notificationId: notification.id,
          retryAfter: getRetryDelay(latest.retryCount - 1),
        });
      } else {
        await notificationRepository.updateNotificationStatus(
          notification.id,
          NOTIFICATION_STATUS.FAILED,
        );

        logger.error("Notification retry limit exceeded.", {
          notificationId: notification.id,
        });
      }
    }

    return null;
  }
};

const getNotificationById = async (id) => {
  return notificationRepository.findNotificationById(id);
};

const getUserNotifications = async (userId, pagination) => {
  return notificationRepository.findUserNotifications(userId, pagination);
};

const getUnreadCount = async (userId) => {
  return notificationRepository.countUnreadNotifications(userId);
};

const markAsRead = async (id, userId) => {
  const notification = await notificationRepository.findNotificationById(id);

  if (!notification) {
    throw new NotificationNotFoundError();
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError();
  }

  return notificationRepository.markNotificationAsRead(id);
};

const markAllAsRead = async (userId) => {
  return notificationRepository.markAllNotificationsAsRead(userId);
};

const deleteNotification = async (id, userId) => {
  const notification = await notificationRepository.findNotificationById(id);

  if (!notification) {
    throw new NotificationNotFoundError();
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError();
  }

  return notificationRepository.deleteNotification(id);
};

module.exports = {
  createNotification,
  dispatchNotification,
  getNotificationById,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
