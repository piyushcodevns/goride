const os = require("os");
const prisma = require("../../config/prisma");
const { redisConnection } = require("../../config/redis");
const { getWorkerStatus } = require("../../workers/notification.worker");
const {
  notificationQueue,
  retryQueue,
  scheduledQueue,
  deadLetterQueue,
} = require("../../queues/notification.queue");

const QUEUES = [
  ["notification", notificationQueue],
  ["notification-retry", retryQueue],
  ["notification-scheduled", scheduledQueue],
  ["notification-dlq", deadLetterQueue],
];

const getWorkerRuntimeStatus = () => getWorkerStatus();

const getServerStatus = () => ({
  status: "UP",
  uptimeSeconds: Math.floor(process.uptime()),
  nodeVersion: process.version,
  platform: process.platform,
  pid: process.pid,
  hostname: os.hostname(),
});

const getMemoryUsage = () => {
  const memory = process.memoryUsage();

  return {
    rssBytes: memory.rss,
    heapTotalBytes: memory.heapTotal,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBuffersBytes: memory.arrayBuffers,
  };
};

const getCpuUsage = async () => {
  const start = process.cpuUsage();
  const startTime = process.hrtime.bigint();

  await new Promise((resolve) => setTimeout(resolve, 100));

  const usage = process.cpuUsage(start);
  const elapsedMicros = Number(process.hrtime.bigint() - startTime) / 1000;

  return {
    userMicros: usage.user,
    systemMicros: usage.system,
    percent:
      elapsedMicros > 0
        ? Number(
            (((usage.user + usage.system) / elapsedMicros) * 100).toFixed(2),
          )
        : 0,
  };
};

const getRedisStatus = async () => {
  try {
    if (redisConnection.status === "wait") {
      await redisConnection.connect();
    }

    const result = await redisConnection.ping();

    return {
      status: result === "PONG" ? "UP" : "DOWN",
      connected: redisConnection.status === "ready",
      response: result,
    };
  } catch (error) {
    return {
      status: "DOWN",
      connected: false,
      error: error.message,
    };
  }
};

const getQueueStatus = async () => {
  const queues = {};

  for (const [name, getter] of QUEUES) {
    try {
      const queue = getter();
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );

      queues[name] = {
        status: "UP",
        counts,
      };
    } catch (error) {
      queues[name] = {
        status: "DOWN",
        error: error.message,
      };
    }
  }

  return queues;
};

const getFailedJobs = async () => {
  const failedJobs = {};

  for (const [name, getter] of QUEUES) {
    try {
      const jobs = await getter().getFailed(0, 49);

      failedJobs[name] = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      }));
    } catch (error) {
      failedJobs[name] = {
        error: error.message,
      };
    }
  }

  return failedJobs;
};

const getDatabaseStatus = async () => {
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "UP",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: "DOWN",
      latencyMs: Date.now() - started,
      error: error.message,
    };
  }
};

const getHealthCheck = async () => {
  const [redis, database] = await Promise.all([
    getRedisStatus(),
    getDatabaseStatus(),
  ]);

  const healthy = redis.status === "UP" && database.status === "UP";
  const workers = getWorkerRuntimeStatus();

  return {
    status: healthy ? "HEALTHY" : "UNHEALTHY",
    healthy,
    timestamp: new Date().toISOString(),
    server: getServerStatus(),
    workers,
    redis,
    database,
  };
};

const getSystemStatus = async () => {
  const workers = getWorkerRuntimeStatus();
  const [redis, queues, failedJobs, database, cpu] = await Promise.all([
    getRedisStatus(),
    getQueueStatus(),
    getFailedJobs(),
    getDatabaseStatus(),
    getCpuUsage(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    server: getServerStatus(),
    workers,
    memory: getMemoryUsage(),
    cpu,
    redis,
    queues,
    failedJobs,
    database,
  };
};

module.exports = {
  getServerStatus,
  getMemoryUsage,
  getCpuUsage,
  getWorkerRuntimeStatus,
  getRedisStatus,
  getQueueStatus,
  getFailedJobs,
  getDatabaseStatus,
  getHealthCheck,
  getSystemStatus,
};
