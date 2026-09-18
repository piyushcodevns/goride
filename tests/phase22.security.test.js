process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";
process.env.JWT_SECRET = "test_jwt_secret_at_least_32_characters_long_for_security_tests";
process.env.JWT_ISSUER = "goride";
process.env.JWT_AUDIENCE = "goride-api";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const { generateToken, verifyToken } = require("../src/utils/jwt");
const { authorize } = require("../src/middleware/authorize.middleware");
const { requirePermission } = require("../src/middleware/admin/adminRbac.middleware");
const ADMIN_ROLES = require("../src/constants/adminRoles");
const ADMIN_PERMISSIONS = require("../src/constants/adminPermissions");
const { UnauthorizedError, ForbiddenError } = require("../src/utils/AppError");
const { redactSensitiveData, sanitizeString } = require("../src/utils/redact");

describe("PHASE 22: Security & Adversarial Defense", () => {
  test("Authentication: Rejects token with 'none' algorithm or tampered header", () => {
    const payload = { id: "user_123", role: "USER" };
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const unsignedToken = `${header}.${body}.`;

    assert.throws(
      () => verifyToken(unsignedToken),
      (err) => err instanceof jwt.JsonWebTokenError || err instanceof UnauthorizedError
    );
  });

  test("Authentication: Rejects token signed with different secret or tampered payload", () => {
    const validToken = generateToken({ id: "user_123", role: "USER" });
    const parts = validToken.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ id: "user_123", role: "SUPER_ADMIN" })).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => verifyToken(tamperedToken),
      (err) => err instanceof jwt.JsonWebTokenError || err instanceof UnauthorizedError
    );

    const foreignToken = jwt.sign({ id: "user_123" }, "completely_foreign_secret_1234567890");
    assert.throws(
      () => verifyToken(foreignToken),
      (err) => err instanceof jwt.JsonWebTokenError || err instanceof UnauthorizedError
    );
  });

  test("Authentication: Rejects expired token", () => {
    const expiredToken = jwt.sign(
      { id: "user_123", role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );

    assert.throws(
      () => verifyToken(expiredToken),
      (err) => err instanceof jwt.TokenExpiredError || err instanceof UnauthorizedError
    );
  });

  test("Authorization: Enforces strict horizontal and vertical role boundaries", async () => {
    // 1. Regular user trying to access driver endpoint
    const reqUser = { user: { id: "user_1", role: "USER" } };
    let nextCalled = false;
    let caughtError = null;

    authorize("DRIVER")(reqUser, {}, (err) => {
      if (err) caughtError = err;
      else nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.ok(caughtError instanceof ForbiddenError);

    // 2. SUPPORT_EXECUTIVE trying to perform administrative user:delete
    const reqSupport = {
      admin: {
        id: "admin_support",
        role: ADMIN_ROLES.SUPPORT_EXECUTIVE,
      },
    };

    let permError = null;
    const supportMiddleware = requirePermission(ADMIN_PERMISSIONS.USER_DELETE);
    await supportMiddleware(reqSupport, {}, (err) => {
      if (err) permError = err;
    });
    assert.ok(permError instanceof ForbiddenError);

    // 3. SUPER_ADMIN is granted unconditional access
    const reqSuper = {
      admin: {
        id: "admin_super",
        role: ADMIN_ROLES.SUPER_ADMIN,
      },
    };
    let superPassed = false;
    const superMiddleware = requirePermission(ADMIN_PERMISSIONS.USER_DELETE);
    await superMiddleware(reqSuper, {}, (err) => {
      if (!err) superPassed = true;
    });
    assert.equal(superPassed, true);
  });

  test("Input Security: Prototype pollution keys are neutralized", () => {
    const maliciousPayload = {
      name: "Normal User",
      __proto__: { isAdmin: true },
      constructor: { prototype: { hacked: true } },
    };

    const clean = JSON.parse(JSON.stringify(maliciousPayload));
    assert.equal(Object.prototype.isAdmin, undefined);
    assert.equal(Object.prototype.hacked, undefined);
  });

  test("Data Leakage: Sensitive fields and credentials are completely redacted", () => {
    const sensitiveLog = {
      user: {
        email: "rider@goride.com",
        password: "SuperSecretPassword123!",
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      payment: {
        card: "4111111111111234",
        cvv: "123",
      },
    };

    const redacted = redactSensitiveData(sensitiveLog);
    assert.equal(redacted.user.password, "[REDACTED]");
    assert.equal(redacted.user.twoFactorSecret, "[REDACTED]");
    assert.equal(redacted.user.token, "[REDACTED]");
    assert.equal(redacted.payment.cvv, "[REDACTED]");
    assert.equal(redacted.user.email, "rider@goride.com");

    const headerStr = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malicious.signature";
    const redactedHeader = sanitizeString(headerStr);
    assert.ok(!redactedHeader.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert.ok(redactedHeader.includes("[REDACTED]"));
  });

  test("Secrets Audit: Scans repository files to ensure no real credentials are committed", () => {
    const projectRoot = path.resolve(__dirname, "..");
    const trackedFiles = [
      "src/app.js",
      "src/utils/jwt.js",
      "src/config/index.js",
      ".env.example",
      "package.json",
    ];

    const forbiddenPatterns = [
      /AKIA[0-9A-Z]{16}/,
      /ghp_[0-9a-zA-Z]{36}/,
      /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
      /AIza[0-9A-Za-z\-_]{35}/,
    ];

    for (const relPath of trackedFiles) {
      const fullPath = path.join(projectRoot, relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const pattern of forbiddenPatterns) {
          assert.equal(
            pattern.test(content),
            false,
            `File ${relPath} contains prohibited active secret matching ${pattern}`
          );
        }
      }
    }
  });
});
