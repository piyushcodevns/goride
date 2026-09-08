const prisma = require("../config/prisma");
const { redisConnection, isQueueEnabled } = require("../config/redis");
const { getAllWorkerStatus } = require("../workers");
const metrics = require("../utils/metrics");

/**
 * Liveness Probe: Verifies application event loop / HTTP process is responsive.
 * Does not fail merely because external dependencies are reconnecting.
 */
const getLiveness = () => ({
  status: "ok",
  live: true,
  uptimeSeconds: Math.floor(process.uptime()),
  timestamp: new Date().toISOString(),
  pid: process.pid,
});

/**
 * Check PostgreSQL database connectivity.
 */
const checkDatabase = async () => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      error: error.message,
    };
  }
};

/**
 * Check Redis connectivity.
 */
const checkRedis = async () => {
  if (!isQueueEnabled()) {
    return {
      status: "disabled",
      latencyMs: 0,
    };
  }

  const started = Date.now();
  try {
    if (!redisConnection) {
      return { status: "down", latencyMs: 0, error: "Redis client not initialized" };
    }
    const pong = await redisConnection.ping();
    return {
      status: pong === "PONG" ? "ok" : "down",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      error: error.message,
    };
  }
};

/**
 * Readiness Probe: Verifies critical infrastructure dependencies.
 */
const getReadiness = async () => {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const isDbReady = database.status === "ok";
  const isRedisReady = redis.status === "ok" || redis.status === "disabled";
  const ready = isDbReady && isRedisReady;

  return {
    status: ready ? "ok" : "down",
    ready,
    timestamp: new Date().toISOString(),
    checks: {
      database: database.status,
      databaseLatencyMs: database.latencyMs,
      redis: redis.status,
      redisLatencyMs: redis.latencyMs,
    },
  };
};

/**
 * Comprehensive health summary.
 */
const getHealthSummary = async () => {
  const [readiness, workers] = await Promise.all([
    getReadiness(),
    Promise.resolve(getAllWorkerStatus()),
  ]);

  return {
    status: readiness.ready ? "ok" : "degraded",
    live: true,
    ready: readiness.ready,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: readiness.checks,
    workers,
    metrics: metrics.getSummary(),
  };
};

module.exports = {
  getLiveness,
  getReadiness,
  getHealthSummary,
  checkDatabase,
  checkRedis,
};
