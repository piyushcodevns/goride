const { Worker } = require("bullmq");

const notificationRepository = require("../repositories/notification.repository");
const {
  deliverNotification,
} = require("../services/notification/delivery.service");

const logger = require("../utils/logger");

const {
  NOTIFICATION_STATUS,
  NOTIFICATION_RETRY,
} = require("../constants/notification.constants");

const { redisConnection, isQueueEnabled } = require("../config/redis");

const { deadLetterQueue } = require("../queues/notification.queue");

/**
 * BullMQ custom exponential retry backoff.
 *
 * Attempts:
 * 1st retry  -> 5 sec
 * 2nd retry  -> 30 sec
 * 3rd retry  -> 120 sec
 */
const notificationBackoffStrategy = (attemptsMade) => {
  const delays = NOTIFICATION_RETRY.DELAYS || [5000, 30000, 120000];

  return delays[Math.min(attemptsMade, delays.length - 1)];
};

/**
 * Handle a permanently failed notification job.
 *
 * BullMQ calls this only when the configured attempts
 * have been exhausted.
 */
const handleJobFailure = async (job, err) => {
  const notificationId = job?.data?.notificationId;

  if (!notificationId) {
    logger.error("Notification job failed without notification ID.", {
      jobId: job?.id,
      error: err?.message,
    });

    return;
  }

  const notification =
    await notificationRepository.findNotificationById(notificationId);

  if (!notification) {
    logger.error("Failed notification record not found.", {
      notificationId,
      jobId: job?.id,
      error: err?.message,
    });

    return;
  }

  const attemptsMade = job.attemptsMade ?? 0;
  const maxAttempts = job.opts?.attempts ?? 1;

  const metadata = {
    jobId: job?.id,
    notificationId,
    queueName: job?.queueName,
    error: err?.message,
    attemptsMade,
    maxAttempts,
    retryCount: notification.retryCount,
  };

  /**
   * Safety check.
   *
   * BullMQ normally invokes the failed event on every failed
   * attempt, but only the final attempt should reach DLQ.
   */
  if (attemptsMade < maxAttempts) {
    await notificationRepository.incrementRetryCount(notification.id);

    logger.warn(
      "Notification attempt failed. BullMQ will retry automatically.",
      {
        ...metadata,
        nextAttempt: attemptsMade + 1,
        retryDelay: notificationBackoffStrategy(attemptsMade),
      },
    );

    return;
  }

  /**
   * Final failure.
   */
  await notificationRepository.incrementRetryCount(notification.id);

  await notificationRepository.updateNotificationStatus(
    notification.id,
    NOTIFICATION_STATUS.FAILED,
  );

  const dlq = deadLetterQueue();

  if (dlq) {
    await dlq.add(
      "notification-dlq",
      {
        notificationId: notification.id,
        reason: err?.message || "Notification delivery failed.",
        metadata: {
          ...metadata,
          retryCount: notification.retryCount + 1,
        },
        failedAt: new Date().toISOString(),
      },
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    logger.warn("Notification moved to dead letter queue.", {
      notificationId,
      jobId: job?.id,
      queueName: job?.queueName,
    });
  } else {
    logger.error(
      "Dead letter queue unavailable for permanently failed notification.",
      {
        ...metadata,
        notificationId,
      },
    );
  }

  logger.error(
    "Notification failed permanently after maximum retry attempts.",
    {
      ...metadata,
      retryCount: notification.retryCount + 1,
    },
  );
};

/**
 * Create notification worker.
 */
const createWorker = (queueName = "notification") => {
  if (!isQueueEnabled()) {
    logger.info("Notification worker skipped because queueing is disabled.", {
      queueName,
    });

    return null;
  }

  const worker = new Worker(
    queueName,

    async (job) => {
      const { notificationId } = job.data || {};

      if (!notificationId) {
        throw new Error("Notification ID is required for processing.");
      }

      const notification =
        await notificationRepository.findNotificationById(notificationId);

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found.`);
      }

      /**
       * Mark notification as processing.
       */
      await notificationRepository.updateNotificationStatus(
        notification.id,
        NOTIFICATION_STATUS.PROCESSING,
      );

      logger.info("Notification job started.", {
        notificationId: notification.id,
        queueName,
        jobId: job.id,
        attempt: (job.attemptsMade || 0) + 1,
      });

      /**
       * Actual delivery.
       *
       * Any delivery error is intentionally thrown so
       * BullMQ can perform its automatic retry.
       */
      await deliverNotification(notification);

      /**
       * Delivery succeeded.
       */
      await notificationRepository.updateNotificationStatus(
        notification.id,
        NOTIFICATION_STATUS.SENT,
      );

      logger.info("Notification job completed.", {
        notificationId: notification.id,
        queueName,
        jobId: job.id,
      });

      return {
        success: true,
        notificationId: notification.id,
      };
    },

    {
      connection: redisConnection,

      concurrency: 4,

      lockDuration: 30000,

      stalledInterval: 30000,

      maxStalledCount: 1,

      settings: {
        backoffStrategy: notificationBackoffStrategy,
      },

      removeOnComplete: {
        age: 3600,
      },

      removeOnFail: {
        age: 86400,
      },
    },
  );

  worker.on("active", (job) => {
    logger.info("Worker active job.", {
      jobId: job?.id,
      queueName,
    });
  });

  worker.on("completed", (job) => {
    logger.info("Worker completed job.", {
      jobId: job?.id,
      queueName,
    });
  });

  worker.on("failed", async (job, err) => {
    try {
      logger.error("Worker failed processing notification job.", {
        jobId: job?.id,
        queueName,
        error: err?.message,
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts?.attempts,
      });

      await handleJobFailure(job, err);
    } catch (failureHandlerError) {
      logger.error("Notification failure handler failed.", {
        jobId: job?.id,
        queueName,
        error: failureHandlerError?.message,
      });
    }
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Worker stalled job detected.", {
      jobId,
      queueName,
    });
  });

  worker.on("error", (error) => {
    logger.error("Worker encountered an error.", {
      queueName,
      error: error?.message,
    });
  });

  worker.on("ready", () => {
    logger.info("Worker ready.", {
      queueName,
    });
  });

  return worker;
};

module.exports = {
  createWorker,
};
