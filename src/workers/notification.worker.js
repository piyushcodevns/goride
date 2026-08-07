const { Worker } = require('bullmq');
const notificationRepository = require('../repositories/notification.repository');
const { deliverNotification } = require('../services/notification/delivery.service');
const { getRetryDelay, canRetry } = require('../services/notification/retry.service');
const logger = require('../utils/logger');
const { NOTIFICATION_STATUS } = require('../constants/notification.constants');
const { redisConnection, isQueueEnabled } = require('../config/redis');
const { retryQueue, deadLetterQueue } = require('../queues/notification.queue');

const buildFailureMetadata = (job, err, notification) => ({
  jobId: job?.id,
  notificationId: notification?.id || job?.data?.notificationId,
  queueName: job?.name,
  error: err?.message,
  retryCount: notification?.retryCount || 0,
});

const handleJobFailure = async (job, err) => {
  const notificationId = job?.data?.notificationId;

  if (!notificationId) {
    logger.error('Worker failed without notification context.', buildFailureMetadata(job, err));
    return;
  }

  const notification = await notificationRepository.findNotificationById(notificationId);

  if (!notification) {
    logger.error('Notification no longer exists after worker failure.', buildFailureMetadata(job, err, notification));
    return;
  }

  await notificationRepository.incrementRetryCount(notification.id);
  const latest = await notificationRepository.findNotificationById(notification.id);

  if (canRetry(latest.retryCount)) {
    const retryDelay = getRetryDelay(latest.retryCount - 1);
    logger.info('Retry scheduled for notification job.', {
      notificationId: notification.id,
      retryCount: latest.retryCount,
      retryDelay,
      queueName: job?.name,
    });

    await retryQueue().add('notification-retry', {
      notificationId: notification.id,
      retryCount: latest.retryCount,
      originalQueueName: job?.name,
    }, {
      delay: retryDelay,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });

    logger.warn('Retry scheduled for notification job.', {
      notificationId: notification.id,
      retryCount: latest.retryCount,
      retryDelay,
      queueName: job?.name,
    });
  } else {
    await notificationRepository.updateNotificationStatus(notification.id, NOTIFICATION_STATUS.FAILED);
    await deadLetterQueue().add('notification-dlq', {
      notificationId: notification.id,
      reason: err?.message,
      metadata: buildFailureMetadata(job, err, latest),
      failedAt: new Date().toISOString(),
    }, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });

    logger.error('Notification failed permanently after max retries.', buildFailureMetadata(job, err, latest));
    logger.warn('Notification moved to dead letter queue.', {
      notificationId: notification.id,
      queueName: job?.name,
    });
  }
};

const createWorker = (queueName = 'notification') => {
  if (!isQueueEnabled()) {
    logger.info('Notification worker skipped because queueing is disabled.', { queueName });
    return null;
  }

  const worker = new Worker(
    queueName,
    async (job) => {
      const { notificationId } = job.data;

      if (!notificationId) {
        throw new Error('Notification ID is required for processing.');
      }

      const notification = await notificationRepository.findNotificationById(notificationId);

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found.`);
      }

      await notificationRepository.updateNotificationStatus(notification.id, NOTIFICATION_STATUS.PROCESSING);
      logger.info('Notification job started.', { notificationId: notification.id, queueName, jobId: job.id });

      await deliverNotification(notification);
      await notificationRepository.updateNotificationStatus(notification.id, NOTIFICATION_STATUS.SENT);

      logger.info('Notification job completed.', { notificationId: notification.id, queueName, jobId: job.id });
      return { success: true };
    },
    {
      connection: redisConnection,
      concurrency: 4,
      lockDuration: 30000,
      stalledInterval: 30000,
      maxStalledCount: 1,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  );

  worker.on('active', (job) => {
    logger.info('Worker active job.', { jobId: job.id, queueName });
  });

  worker.on('completed', (job) => {
    logger.info('Worker completed job.', { jobId: job.id, queueName });
  });

  worker.on('failed', async (job, err) => {
    logger.error('Worker failed processing notification job.', {
      jobId: job?.id,
      queueName,
      error: err?.message,
    });

    await handleJobFailure(job, err);
  });

  worker.on('stalled', (job) => {
    logger.warn('Worker stalled job detected.', { jobId: job?.id, queueName });
  });

  worker.on('error', (error) => {
    logger.error('Worker encountered an error.', { queueName, error: error?.message });
  });

  worker.on('ready', () => {
    logger.info('Worker ready.', { queueName });
  });

  return worker;
};

module.exports = {
  createWorker,
};
