process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");

const { redactSensitiveData, sanitizeString, isSensitiveKey } = require("../src/utils/redact");
const logger = require("../src/utils/logger");
const metrics = require("../src/utils/metrics");
const { correlationMiddleware, resolveRequestId } = require("../src/middleware/correlation.middleware");
const errorMiddleware = require("../src/middleware/error.middleware");
const healthService = require("../src/services/health.service");
const adminMonitoringService = require("../src/services/admin/adminMonitoring.service");
const { AppError } = require("../src/utils/AppError");

// ============================================================================
// 1. Sensitive Data Redaction Tests
// ============================================================================

test("Redaction: Identifies sensitive key patterns accurately", () => {
  assert.equal(isSensitiveKey("password"), true);
  assert.equal(isSensitiveKey("user_password"), true);
  assert.equal(isSensitiveKey("token"), true);
  assert.equal(isSensitiveKey("accessToken"), true);
  assert.equal(isSensitiveKey("refreshToken"), true);
  assert.equal(isSensitiveKey("secret"), true);
  assert.equal(isSensitiveKey("clientSecret"), true);
  assert.equal(isSensitiveKey("authorization"), true);
  assert.equal(isSensitiveKey("cookie"), true);
  assert.equal(isSensitiveKey("apiKey"), true);
  assert.equal(isSensitiveKey("api_key"), true);
  assert.equal(isSensitiveKey("encryptionKey"), true);
  assert.equal(isSensitiveKey("otp"), true);
  assert.equal(isSensitiveKey("twoFactorSecret"), true);
  assert.equal(isSensitiveKey("creditCard"), true);
  assert.equal(isSensitiveKey("cvv"), true);
  assert.equal(isSensitiveKey("pin"), true);

  // Non-sensitive keys
  assert.equal(isSensitiveKey("username"), false);
  assert.equal(isSensitiveKey("email"), false);
  assert.equal(isSensitiveKey("requestId"), false);
  assert.equal(isSensitiveKey("status"), false);
});

test("Redaction: Sanitizes Bearer authorization headers and Redis credentials in strings", () => {
  const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";
  const sanitizedAuth = sanitizeString(authHeader);
  assert.equal(sanitizedAuth, "Bearer [REDACTED]");

  const redisUrl = "redis://default:supersecretpassword@127.0.0.1:6379";
  const sanitizedRedis = sanitizeString(redisUrl);
  assert.equal(sanitizedRedis, "redis://default:***@127.0.0.1:6379");
});

test("Redaction: Deeply redacts nested objects, arrays, and prevents circular reference overflow", () => {
  const payload = {
    user: {
      id: "u-123",
      email: "test@example.com",
      password: "PlainTextPassword123!",
      profile: {
        otp: "123456",
        two_factor_secret: "JBSWY3DPEHPK3PXP",
      },
    },
    authTokens: ["Bearer abc.def.ghi", { refresh_token: "secret_refresh_token" }],
    items: ["Bearer abc.def.ghi", { note: "public item" }],
    metadata: {
      tags: ["auth", "login"],
    },
  };

  const redacted = redactSensitiveData(payload);

  assert.equal(redacted.user.id, "u-123");
  assert.equal(redacted.user.email, "test@example.com");
  assert.equal(redacted.user.password, "[REDACTED]");
  assert.equal(redacted.user.profile.otp, "[REDACTED]");
  assert.equal(redacted.user.profile.two_factor_secret, "[REDACTED]");
  assert.equal(redacted.authTokens, "[REDACTED]");
  assert.equal(redacted.items[0], "Bearer [REDACTED]");
  assert.equal(redacted.items[1].note, "public item");
  assert.deepEqual(redacted.metadata.tags, ["auth", "login"]);

  // Circular reference test
  const circularObj = { name: "loop", secret: "mypassword" };
  circularObj.self = circularObj;

  const sanitizedCircular = redactSensitiveData(circularObj);
  assert.equal(sanitizedCircular.name, "loop");
  assert.equal(sanitizedCircular.secret, "[REDACTED]");
  assert.equal(sanitizedCircular.self, "[Circular]");
});

test("Redaction: Logger methods execute cleanly without throwing errors", () => {
  assert.doesNotThrow(() => {
    logger.info("Test info log", { requestId: "req-1", password: "should-be-hidden" });
    logger.warn("Test warn log", { token: "secret-token" });
    logger.error("Test error log", { err: new Error("Test error") });
  });
});

// ============================================================================
// 2. Correlation ID & Observability Middleware Tests
// ============================================================================

test("Correlation: Generates UUIDv4 if no X-Request-ID header provided", () => {
  const generatedId = resolveRequestId(undefined);
  assert.ok(typeof generatedId === "string");
  assert.match(
    generatedId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
});

test("Correlation: Preserves and validates incoming client X-Request-ID", () => {
  const validClientHeader = "req-client-trace-12345";
  const resolved = resolveRequestId(validClientHeader);
  assert.equal(resolved, "req-client-trace-12345");

  // Rejects invalid characters and falls back to UUIDv4
  const invalidHeader = "invalid id with spaces symbols injection";
  const fallback = resolveRequestId(invalidHeader);
  assert.notEqual(fallback, invalidHeader);
  assert.match(
    fallback,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
});

test("Correlation: Middleware attaches requestId to req and response headers", (t, done) => {
  const req = {
    headers: {
      "x-request-id": "client-custom-req-id",
    },
    method: "GET",
    url: "/api/test",
  };

  const headersSet = {};
  const res = {
    statusCode: 200,
    setHeader: (name, value) => {
      headersSet[name] = value;
    },
    on: (event, handler) => {
      if (event === "finish") {
        setTimeout(handler, 10);
      }
    },
  };

  correlationMiddleware(req, res, () => {
    assert.equal(req.id, "client-custom-req-id");
    assert.equal(req.correlationId, "client-custom-req-id");
    assert.equal(headersSet["X-Request-ID"], "client-custom-req-id");
    assert.equal(headersSet["X-Correlation-ID"], "client-custom-req-id");
    done();
  });
});

// ============================================================================
// 3. Error Handling Middleware & Correlation Association Tests
// ============================================================================

test("Error Middleware: Injects requestId into client response and logs error", () => {
  const req = {
    id: "req-err-trace-999",
    method: "POST",
    originalUrl: "/api/rides",
  };

  let responseStatus = 0;
  let responseJson = null;

  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (payload) => {
          responseJson = payload;
        },
      };
    },
  };

  const operationalErr = new AppError("Ride cannot be cancelled at this stage", 400);

  errorMiddleware(operationalErr, req, res, () => {});

  assert.equal(responseStatus, 400);
  assert.equal(responseJson.success, false);
  assert.equal(responseJson.message, "Ride cannot be cancelled at this stage");
  assert.equal(responseJson.requestId, "req-err-trace-999");
});

test("Error Middleware: Conceals stack traces and internal details on unexpected 500 errors", () => {
  const req = {
    id: "req-unhandled-500",
    method: "GET",
    originalUrl: "/api/internal",
  };

  let responseStatus = 0;
  let responseJson = null;

  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (payload) => {
          responseJson = payload;
        },
      };
    },
  };

  const unhandledErr = new Error("FATAL: secret_db_role password failed at /var/app/secret.js:42");

  errorMiddleware(unhandledErr, req, res, () => {});

  assert.equal(responseStatus, 500);
  assert.equal(responseJson.success, false);
  assert.equal(responseJson.message, "Internal Server Error");
  assert.equal(responseJson.requestId, "req-unhandled-500");
  assert.equal(responseJson.stack, undefined);
  assert.equal(JSON.stringify(responseJson).includes("secret_db_role"), false);
});

// ============================================================================
// 4. Metrics Registry Accumulator Tests
// ============================================================================

test("Metrics: Records requests, error counts, status distributions, and computes percentiles", () => {
  metrics.reset();

  metrics.recordRequest("GET", "/api/rides", 200, 50);
  metrics.recordRequest("GET", "/api/rides", 200, 100);
  metrics.recordRequest("POST", "/api/rides", 201, 150);
  metrics.recordRequest("GET", "/api/rides/999", 404, 20);
  metrics.recordRequest("POST", "/api/payments", 500, 500);
  metrics.recordError("PaymentGatewayTimeout");
  metrics.recordQueueJob("notification", "completed");
  metrics.recordQueueJob("notification", "failed");

  const summary = metrics.getSummary();

  assert.equal(summary.totalRequests, 5);
  // totalErrors includes 1 from 500 status code + 1 from recordError
  assert.equal(summary.totalErrors, 2);
  assert.equal(summary.requestsByStatus["2xx"], 3);
  assert.equal(summary.requestsByStatus["4xx"], 1);
  assert.equal(summary.requestsByStatus["5xx"], 1);
  assert.equal(summary.statusCodes[200], 2);
  assert.equal(summary.statusCodes[201], 1);
  assert.equal(summary.statusCodes[404], 1);
  assert.equal(summary.statusCodes[500], 1);
  assert.equal(summary.errorsByType["PaymentGatewayTimeout"], 1);
  assert.equal(summary.queueJobs["notification"].completed, 1);
  assert.equal(summary.queueJobs["notification"].failed, 1);

  assert.ok(summary.latency.minMs <= 20);
  assert.ok(summary.latency.maxMs >= 500);
  assert.ok(summary.latency.p50Ms > 0);
  assert.ok(summary.latency.p95Ms >= summary.latency.p50Ms);
  assert.ok(summary.latency.p99Ms >= summary.latency.p95Ms);
});

// ============================================================================
// 5. Health Probes & Service Tests
// ============================================================================

test("Health: Liveness probe returns live: true with valid uptime and PID", () => {
  const liveness = healthService.getLiveness();
  assert.equal(liveness.status, "ok");
  assert.equal(liveness.live, true);
  assert.ok(typeof liveness.uptimeSeconds === "number");
  assert.ok(liveness.pid > 0);
  assert.ok(Date.parse(liveness.timestamp) > 0);
});

test("Health: Readiness probe accurately reflects database and redis status", async () => {
  const readiness = await healthService.getReadiness();

  assert.ok("ready" in readiness);
  assert.ok("checks" in readiness);
  assert.ok("database" in readiness.checks);
  assert.ok("redis" in readiness.checks);
  assert.ok(["ok", "down"].includes(readiness.checks.database));
  assert.ok(["ok", "disabled", "down"].includes(readiness.checks.redis));
});

test("Health: Full health summary bundles liveness, readiness, workers, and metrics", async () => {
  const health = await healthService.getHealthSummary();

  assert.ok("status" in health);
  assert.equal(health.live, true);
  assert.ok("checks" in health);
  assert.ok("workers" in health);
  assert.ok("metrics" in health);
  assert.ok(typeof health.metrics.totalRequests === "number");
});

// ============================================================================
// 6. Admin Monitoring Integration Tests
// ============================================================================

test("Admin Monitoring: Integrates scheduler status and metrics summary", async () => {
  const schedulers = adminMonitoringService.getSchedulerStatus();
  assert.ok(Array.isArray(schedulers));
  assert.ok(schedulers.length >= 3);

  const schedulerNames = schedulers.map((s) => s.name);
  assert.ok(schedulerNames.includes("scheduled-rides-sweep"));
  assert.ok(schedulerNames.includes("daily-cleanup"));
  assert.ok(schedulerNames.includes("daily-backup"));

  const systemStatus = await adminMonitoringService.getSystemStatus();
  assert.ok(systemStatus.metrics);
  assert.ok("requestsByStatus" in systemStatus.metrics);
  assert.ok("latency" in systemStatus.metrics);
  assert.ok(Array.isArray(systemStatus.schedulers));
});
