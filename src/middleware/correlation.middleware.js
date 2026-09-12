const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const metrics = require("../utils/metrics");

const VALID_ID_PATTERN = /^[a-zA-Z0-9_\-.]{1,64}$/;

/**
 * Validate or generate a request / correlation ID.
 */
const resolveRequestId = (headerValue) => {
  if (typeof headerValue === "string" && VALID_ID_PATTERN.test(headerValue.trim())) {
    return headerValue.trim();
  }
  return uuidv4();
};

/**
 * Request Correlation & Observability Middleware.
 * Attaches unique request IDs, sets response headers, tracks request latency,
 * logs request lifecycle, and updates memory-bounded application metrics.
 */
const correlationMiddleware = (req, res, next) => {
  const incomingRequestId = req.headers["x-request-id"];
  const incomingCorrelationId = req.headers["x-correlation-id"];

  const requestId = resolveRequestId(incomingRequestId);
  const correlationId = resolveRequestId(incomingCorrelationId || requestId);

  req.id = requestId;
  req.correlationId = correlationId;

  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Correlation-ID", correlationId);

  const startTime = Date.now();
  req.startTime = startTime;

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.url || "/";

    // Track application metrics
    metrics.recordRequest(method, path, statusCode, durationMs);

    // Skip high-frequency basic liveness probe from stdout logs in production/test
    if (path === "/health/live" && statusCode === 200) {
      return;
    }

    const userId = req.user?.id || req.admin?.id || null;
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress;

    const logMeta = {
      requestId,
      correlationId,
      method,
      path,
      statusCode,
      durationMs,
      ip,
      ...(userId ? { userId } : {}),
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${path} failed`, logMeta);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${method} ${path} client error`, logMeta);
    } else if (durationMs > 1000) {
      logger.warn(`HTTP ${method} ${path} slow request`, { ...logMeta, slow: true });
    } else {
      logger.info(`HTTP ${method} ${path}`, logMeta);
    }
  });

  next();
};

module.exports = {
  correlationMiddleware,
  resolveRequestId,
};
