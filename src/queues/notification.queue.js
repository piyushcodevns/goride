const { Queue } = require("bullmq");

const logger = require("../utils/logger");
const {
  redisConnection,
  isQueueEnabled,
  connectRedisIfNeeded,
} = require("../config/redis");
const { NOTIFICATION_RETRY } = require("../constants/notification.constants");

const queueNames = {
  default: "notification",
  retry: "notification-retry",
  scheduled: "notification-scheduled",
  deadLetter: "notification-dlq",
};

const queueInstances = new Map();

const getRetryBackoff = () => ({
  type: "custom",
  delay: 5000,
});

const createQueue = (name) => {
  if (!isQueueEnabled()) {
    return null;
  }

  return new Queue(name, {
    connection: redisConnection,

    defaultJobOptions: {
      attempts: NOTIFICATION_RETRY.MAX_ATTEMPTS,
      backoff: getRetryBackoff(),

      removeOnComplete: {
        age: 3600,
        count: 1000,
      },

      removeOnFail: {
        age: 86400,
        count: 5000,
      },
    },
  });
};

const getQueueInstance = (name = queueNames.default) => {
  if (!isQueueEnabled()) {
    return null;
  }

  if (!queueInstances.has(name)) {
    queueInstances.set(name, createQueue(name));
  }

  return queueInstances.get(name);
};

const notificationQueue = () => getQueueInstance(queueNames.default);

const retryQueue = () => getQueueInstance(queueNames.retry);

const scheduledQueue = () => getQueueInstance(queueNames.scheduled);

const deadLetterQueue = () => getQueueInstance(queueNames.deadLetter);

const getQueueName = (kind = "default") => {
  if (kind === "retry") {
    return queueNames.retry;
  }

  if (kind === "scheduled") {
    return queueNames.scheduled;
  }

  if (kind === "deadLetter") {
    return queueNames.deadLetter;
  }

  return queueNames.default;
};

const buildNotificationJob = (payload, options = {}) => ({
  queueName: queueNames.default,

  data: payload,

  options: {
    attempts: options.attempts ?? NOTIFICATION_RETRY.MAX_ATTEMPTS,

    backoff: options.backoff ?? getRetryBackoff(),

    removeOnComplete: options.removeOnComplete ?? {
      age: 3600,
      count: 1000,
    },

    removeOnFail: options.removeOnFail ?? {
      age: 86400,
      count: 5000,
    },

    ...options,
  },
});

const addNotificationJob = async (payload, options = {}) => {
  if (!isQueueEnabled()) {
    const error = new Error("Notification queue is disabled.");

    logger.warn(
      "Notification queue job skipped because queueing is disabled.",
      {
        notificationId: payload?.notificationId,
      },
    );

    throw error;
  }

  if (!payload?.notificationId) {
    throw new Error("Notification ID is required to enqueue notification job.");
  }

  try {
    await connectRedisIfNeeded();

    let queue;

    if (options.queueName === queueNames.retry) {
      queue = retryQueue();
    } else if (options.queueName === queueNames.scheduled) {
      queue = scheduledQueue();
    } else if (options.queueName === queueNames.deadLetter) {
      queue = deadLetterQueue();
    } else {
      queue = notificationQueue();
    }

    if (!queue) {
      throw new Error("Notification queue instance is unavailable.");
    }

    const jobOptions = {
      ...buildNotificationJob(payload, options).options,
    };

    delete jobOptions.queueName;

    const job = await queue.add("notification-job", payload, jobOptions);

    logger.info("Notification queue job created.", {
      jobId: job.id,
      queueName: queue.name,
      notificationId: payload.notificationId,
    });

    return job;
  } catch (error) {
    logger.error("Unable to enqueue notification job.", {
      error: error.message,
      notificationId: payload?.notificationId,
    });

    throw error;
  }
};

const getQueueHealth = async () => {
  if (!isQueueEnabled()) {
    return {
      healthy: false,
      queueEnabled: false,
      redis: "disabled",
    };
  }

  try {
    if (!redisConnection) {
      return {
        healthy: false,
        queueEnabled: true,
        redis: "unavailable",
      };
    }

    await connectRedisIfNeeded();
    await redisConnection.ping();

    return {
      healthy: true,
      queueEnabled: true,
      redis: "ok",
    };
  } catch (error) {
    logger.error("Redis health check failed.", {
      error: error.message,
    });

    return {
      healthy: false,
      queueEnabled: true,
      redis: "error",
    };
  }
};

const closeQueues = async () => {
  const queues = Array.from(queueInstances.values()).filter(Boolean);

  await Promise.allSettled(queues.map((queue) => queue.close()));

  queueInstances.clear();

  logger.info("Notification queues closed.");

  return true;
};

module.exports = {
  notificationQueue,
  retryQueue,
  scheduledQueue,
  deadLetterQueue,
  redisConnection,
  addNotificationJob,
  getQueueName,
  buildNotificationJob,
  getQueueHealth,
  closeQueues,
};
