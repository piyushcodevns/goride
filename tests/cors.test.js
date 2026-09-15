process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const app = require("../src/app");

describe("GoRide CORS Configuration & Preflight Handling", () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      await prisma.$disconnect();
    } catch (_) {}
    setTimeout(() => process.exit(0), 100).unref();
  });

  test("1. Preflight OPTIONS /api/auth/login succeeds for Vercel preview deployment", async () => {
    const previewOrigin = "https://goride-frontend-8vm8gowne-piyushcodevns-projects.vercel.app";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: previewOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    assert.equal(res.status, 204, "Preflight request must return HTTP 204 No Content");
    assert.equal(res.headers.get("access-control-allow-origin"), previewOrigin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
    assert.match(res.headers.get("access-control-allow-methods"), /POST/);
    assert.match(res.headers.get("access-control-allow-headers"), /Content-Type/i);
  });

  test("2. Preflight OPTIONS succeeds for previous Vercel preview deployment", async () => {
    const oldPreviewOrigin = "https://goride-frontend-ieukthm4z-piyushcodevns-projects.vercel.app";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: oldPreviewOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), oldPreviewOrigin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  });

  test("3. Preflight OPTIONS succeeds for stable production Vercel domains", async () => {
    const stableProdOrigin = "https://goride-frontend.vercel.app";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: stableProdOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), stableProdOrigin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  });

  test("4. Preflight OPTIONS succeeds for local development origin", async () => {
    const localOrigin = "http://localhost:5173";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: localOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), localOrigin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  });

  test("5. Unauthorized origins are rejected without Access-Control-Allow-Origin header", async () => {
    const maliciousOrigin = "https://malicious-attacker-site.com";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: maliciousOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });

    // When an origin is rejected, Access-Control-Allow-Origin must NEVER be returned or be wildcard
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert.equal(allowOrigin, null, "Must not set Access-Control-Allow-Origin for unauthorized origin");
    assert.notEqual(allowOrigin, "*");
  });

  test("6. Actual POST /api/auth/login response contains correct CORS headers for allowed origin", async () => {
    const previewOrigin = "https://goride-frontend-8vm8gowne-piyushcodevns-projects.vercel.app";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        Origin: previewOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      }),
    });

    // The endpoint will return 401/400 for bad credentials, but CORS headers MUST be present
    assert.equal(res.headers.get("access-control-allow-origin"), previewOrigin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  });
});
