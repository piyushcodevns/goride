process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const cacheService = require("../src/services/cache.service");
const errorMiddleware = require("../src/middleware/error.middleware");
const { buildFareIntelligence } = require("../src/ai/predictors/fareIntelligence.predictor");
const httpRetry = require("../src/utils/httpRetry");
const { AppError, BadRequestError } = require("../src/utils/AppError");

describe("PHASE 25: Failure & Chaos Resilience", () => {
  test("Cache / Redis Outage: In-memory fallback handles cache operations seamlessly", async () => {
    const key = "chaos:cache:test";
    await cacheService.set(key, { status: "cached" }, 60);
    const retrieved = await cacheService.get(key);
    assert.deepEqual(retrieved, { status: "cached" });

    const missing = await cacheService.get("chaos:missing:key");
    assert.equal(missing, null);
  });

  test("External Network Outage: httpRetry recovers from transient 503 errors via exponential backoff", async () => {
    let callCount = 0;
    const flakyRequest = async () => {
      callCount += 1;
      if (callCount < 2) {
        const err = new Error("Service Unavailable");
        err.response = { status: 503 };
        throw err;
      }
      return { success: true, data: "recovered" };
    };

    const result = await httpRetry(flakyRequest, { retries: 2, delay: 10 });
    assert.equal(result.success, true);
    assert.equal(result.data, "recovered");
    assert.equal(callCount, 2);
  });

  test("AI Predictor Chaos: Graceful degradation upon corrupted or zero dataset inputs", () => {
    // 1. Completely null inputs
    const nullRes = buildFareIntelligence({ rideHistory: null });
    assert.equal(nullRes.status, "INSUFFICIENT_DATA");
    assert.ok(!nullRes.prediction);

    // 2. Malformed array with NaN/Infinite values
    const corruptedRes = buildFareIntelligence({
      rideHistory: [{ distance: NaN, duration: Infinity, finalFare: "bad" }],
    });
    assert.equal(corruptedRes.status, "INSUFFICIENT_DATA");
  });

  test("Database Outage Shield: Error middleware conceals internal DB crashes and stack traces", () => {
    const mockRes = {
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    const rawDbError = new Error('syntax error at or near "SELECT" in PostgreSQL connection pool');
    rawDbError.stack = "Error: syntax error\n at pg.Client.query (/var/app/node_modules/pg/client.js:12:34)";

    errorMiddleware(rawDbError, { headers: {}, originalUrl: "/chaos/test" }, mockRes, () => {});

    assert.equal(mockRes.statusCode, 500);
    assert.equal(mockRes.payload.success, false);
    assert.ok(!mockRes.payload.message.includes("PostgreSQL connection pool"));
    assert.equal(mockRes.payload.stack, undefined);
  });

  test("Network Timeout / Unhandled Async Safety: Standard AppError carries status and operational flags", () => {
    const customErr = new AppError("Gateway timeout from external provider", 504);
    assert.equal(customErr.statusCode, 504);
    assert.equal(customErr.isOperational, true);
  });
});
