const { Queue } = require('bullmq');

const logger = require('../utils/logger');
const { redisConnection, isQueueEnabled, connectRedisIfNeeded } = require('../config/redis');
const { NOTIFICATION_RETRY } = require('../constants/notification.constants');

const queueNames = {
  default: 'notification',
  retry: 'notification-retry',
  scheduled: 'notification-scheduled',
  deadLetter: 'notification-dlq',
};

const queueInstances = new Map();

const createQueue = (name = queueNames.default) => {
  if (!isQueueEnabled()) {
    return null;
  }

  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: NOTIFICATION_RETRY.MAX_ATTEMPTS,
      backoff: {
        type: 'custom',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
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

const getQueueName = (kind = 'default') => {
  if (kind === 'retry') return queueNames.retry;
  if (kind === 'scheduled') return queueNames.scheduled;
  if (kind === 'deadLetter') return queueNames.deadLetter;
  return queueNames.default;
};

const buildNotificationJob = (payload) => ({
  queueName: queueNames.default,
  data: payload,
  options: {
    attempts: NOTIFICATION_RETRY.MAX_ATTEMPTS,
    backoff: {
      type: 'custom',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const addNotificationJob = async (payload, options = {}) => {
  if (!isQueueEnabled()) {
    const error = new Error('Notification queue is disabled.');
    logger.warn('Notification queue job skipped because queueing is disabled.', {
      notificationId: payload?.notificationId,
    });
    throw error;
  }

  try {
    await connectRedisIfNeeded();

    const queue = options.queueName === queueNames.retry
      ? retryQueue()
      : options.queueName === queueNames.scheduled
        ? scheduledQueue()
        : notificationQueue();

    const job = await queue.add('notification-job', payload, {
      ...buildNotificationJob(payload).options,
      ...options,
    });

    logger.info('Notification queue job created.', {
      jobId: job.id,
      queueName: queue.name,
      notificationId: payload?.notificationId,
    });

    return job;
  } catch (error) {
    logger.error('Unable to enqueue notification job.', {
      error: error.message,
      notificationId: payload?.notificationId,
    });
    throw error;
  }
};

const getQueueHealth = async () => {
  if (!isQueueEnabled()) {
    return { healthy: false, queueEnabled: false, redis: 'disabled' };
  }

  try {
    if (!redisConnection) {
      return { healthy: false, queueEnabled: true, redis: 'unavailable' };
    }

    await connectRedisIfNeeded();
    await redisConnection.ping();
    return { healthy: true, queueEnabled: true, redis: 'ok' };
  } catch (error) {
    logger.error('Redis health check failed.', {
      error: error.message,
    });
    return { healthy: false, queueEnabled: true, redis: 'error' };
  }
};

const closeQueues = async () => {
  const queues = [notificationQueue(), retryQueue(), scheduledQueue(), deadLetterQueue()].filter(Boolean);

  await Promise.allSettled([
    ...queues.map((queue) => queue.close()),
  ]);

  await Promise.allSettled([
    (async () => {
      if (redisConnection && isQueueEnabled()) {
        await redisConnection.quit();
      }
    })(),
  ]);
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
