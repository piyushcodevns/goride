const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { BadRequestError, UnauthorizedError } = require("../src/utils/AppError");
const { ZodError } = require("zod");

describe("PHASE 1: Backend Architecture & Middleware Pipeline", () => {
  let server;
  let baseUrl;

  test("Setup test server", async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl);
  });

  test("GET / returns 200 with service metadata", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, "OK");
    assert.equal(data.version, "1.0.0");
    assert.ok(data.message.includes("GoRide Backend API Running"));
  });

  test("GET /health/liveness returns 200 with live probe details", async () => {
    const res = await fetch(`${baseUrl}/health/liveness`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.live, true);
    assert.ok(typeof body.data.uptimeSeconds === "number");
    assert.ok(typeof body.data.pid === "number");
  });

  test("GET /api/unknown-nonexistent-route returns 404 structured error", async () => {
    const res = await fetch(`${baseUrl}/api/unknown-nonexistent-route`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.message, "API Route Not Found");
  });

  test("Correlation ID: attaches generated UUID when header is absent", async () => {
    const res = await fetch(`${baseUrl}/`);
    const headerReqId = res.headers.get("x-request-id");
    assert.ok(headerReqId, "x-request-id header should be present in response");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(headerReqId, uuidRegex);
  });

  test("Correlation ID: preserves client-provided x-request-id header", async () => {
    const customId = "custom-client-request-id-12345";
    const res = await fetch(`${baseUrl}/`, {
      headers: { "x-request-id": customId },
    });
    assert.equal(res.headers.get("x-request-id"), customId);
  });

  test("Security Headers: Helmet sets X-Content-Type-Options nosniff", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });

  test("Malformed JSON body returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: '{"email": "test@goride.com", "password": ', // malformed json
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.toLowerCase().includes("json"));
  });

  test("Global Error Middleware: handles operational errors and preserves status codes", async () => {
    const errorMiddleware = require("../src/middleware/error.middleware");
    const mockReq = { method: "GET", url: "/test", headers: { "x-request-id": "req-1" } };
    let capturedStatus = 0;
    let capturedJson = null;
    const mockRes = {
      status: (code) => {
        capturedStatus = code;
        return {
          json: (body) => {
            capturedJson = body;
          },
        };
      },
    };

    // Test Operational 400
    errorMiddleware(new BadRequestError("Bad parameter"), mockReq, mockRes, () => {});
    assert.equal(capturedStatus, 400);
    assert.equal(capturedJson.success, false);
    assert.equal(capturedJson.message, "Bad parameter");
    assert.equal(capturedJson.requestId, "req-1");

    // Test Operational 401
    errorMiddleware(new UnauthorizedError("Token required"), mockReq, mockRes, () => {});
    assert.equal(capturedStatus, 401);
    assert.equal(capturedJson.message, "Token required");

    // Test ZodError 400
    const zodErr = new ZodError([
      { code: "invalid_type", expected: "string", received: "number", path: ["email"], message: "Expected string" },
    ]);
    errorMiddleware(zodErr, mockReq, mockRes, () => {});
    assert.equal(capturedStatus, 400);
    assert.equal(capturedJson.message, "Validation failed.");
    assert.ok(Array.isArray(capturedJson.errors));

    // Test Unhandled 500 error hides stack trace
    const internalErr = new Error("Database connection dropped unexpectedly");
    errorMiddleware(internalErr, mockReq, mockRes, () => {});
    assert.equal(capturedStatus, 500);
    assert.equal(capturedJson.message, "Internal Server Error");
    assert.equal(capturedJson.stack, undefined, "Stack trace must not be exposed to client");
  });

  test("Teardown test server", async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
