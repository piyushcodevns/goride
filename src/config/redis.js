const Redis = require('ioredis');
const logger = require('../utils/logger');

const isQueueEnabled = () => {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  if (process.env.QUEUE_ENABLED === 'false') {
    return false;
  }
  if (process.env.NOTIFICATION_QUEUE_ENABLED === 'false') {
    return false;
  }
  return true;
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisConnection = isQueueEnabled()
  ? new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      reconnectOnError: (error) => {
        const message = error?.message || '';
        return message.includes('READONLY') || message.includes('ECONNRESET');
      },
    })
  : null;

if (redisConnection) {
  redisConnection.on('connect', () => {
    logger.info('Redis connected.', {
      url: redisUrl.replace(/\/\/.*@/, '//***@'),
    });
  });

  redisConnection.on('ready', () => {
    logger.info('Redis ready for use.');
  });

  redisConnection.on('reconnecting', (delay) => {
    logger.warn('Redis reconnecting.', { delay });
  });

  redisConnection.on('error', (error) => {
    logger.error('Redis connection error.', {
      error: error?.message,
    });
  });

  redisConnection.on('end', () => {
    logger.warn('Redis connection closed.');
  });
}

const connectRedisIfNeeded = async () => {
  if (!redisConnection || !isQueueEnabled()) {
    return null;
  }

  if (redisConnection.status === 'ready') {
    return redisConnection;
  }

  if (redisConnection.status === 'connecting') {
    return redisConnection;
  }

  try {
    await redisConnection.connect();
    return redisConnection;
  } catch (error) {
    logger.error('Unable to connect to Redis.', {
      error: error?.message,
    });
    throw error;
  }
};

const closeRedisConnection = async () => {
  if (!redisConnection || !isQueueEnabled()) {
    return null;
  }

  try {
    await redisConnection.quit();
    logger.info('Redis disconnected gracefully.');
    return true;
  } catch (error) {
    logger.warn('Redis shutdown completed with warnings.', {
      error: error?.message,
    });
    return false;
  }
};

module.exports = {
  redisConnection,
  isQueueEnabled,
  connectRedisIfNeeded,
  closeRedisConnection,
};
