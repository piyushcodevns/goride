process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  config,
  validateConfig,
  getPublicConfigSummary,
  parseBoolean,
  parseInteger,
} = require("../src/config/env");

// ============================================================================
// 1. Primitive Parsers & Normalizers
// ============================================================================

test("Config Parsers: parseBoolean normalizes valid values accurately", () => {
  assert.equal(parseBoolean(true), true);
  assert.equal(parseBoolean(false), false);
  assert.equal(parseBoolean("true"), true);
  assert.equal(parseBoolean("TRUE"), true);
  assert.equal(parseBoolean("1"), true);
  assert.equal(parseBoolean("yes"), true);
  assert.equal(parseBoolean("false"), false);
  assert.equal(parseBoolean("FALSE"), false);
  assert.equal(parseBoolean("0"), false);
  assert.equal(parseBoolean("no"), false);
  assert.equal(parseBoolean(undefined, true), true);
  assert.equal(parseBoolean(undefined, false), false);
  assert.equal(parseBoolean("", false), false);

  assert.throws(() => parseBoolean("maybe"), /Invalid boolean/);
  assert.throws(() => parseBoolean("2"), /Invalid boolean/);
});

test("Config Parsers: parseInteger normalizes and bounds numbers accurately", () => {
  assert.equal(parseInteger("5000", 3000), 5000);
  assert.equal(parseInteger(undefined, 8080), 8080);
  assert.equal(parseInteger("12", 10, 10, 16), 12);

  // Out of bounds
  assert.throws(() => parseInteger("5", 10, 10, 16), /Invalid integer/);
  assert.throws(() => parseInteger("20", 10, 10, 16), /Invalid integer/);
  assert.throws(() => parseInteger("not-a-number", 10), /Invalid integer/);
  assert.throws(() => parseInteger("3.14", 10), /Invalid integer/);
});

// ============================================================================
// 2. Environment Schema Validation & Defaults (Dev / Test)
// ============================================================================

test("Config Validation: Applies safe defaults in development / test environments", () => {
  const customConfig = validateConfig({
    NODE_ENV: "development",
  });

  assert.equal(customConfig.app.env, "development");
  assert.equal(customConfig.app.port, 5000);
  assert.equal(customConfig.app.isDevelopment, true);
  assert.equal(customConfig.app.isProduction, false);
  assert.equal(customConfig.jwt.issuer, "goride");
  assert.equal(customConfig.jwt.audience, "goride-api");
  assert.equal(customConfig.jwt.expiresIn, "7d");
  assert.equal(customConfig.redis.queueEnabled, true);
  assert.equal(customConfig.schedulers.scheduledRides.cron, "* * * * *");
  assert.equal(customConfig.logging.level, "info");
  assert.equal(customConfig.logging.format, "combined");
});

test("Config Validation: Rejects invalid NODE_ENV enum", () => {
  assert.throws(
    () => validateConfig({ NODE_ENV: "staging" }),
    /Configuration validation failed/,
  );
});

test("Config Validation: Rejects invalid PORT values", () => {
  assert.throws(
    () => validateConfig({ NODE_ENV: "development", PORT: "0" }),
    /must be between 1 and 65535/,
  );
  assert.throws(
    () => validateConfig({ NODE_ENV: "development", PORT: "999999" }),
    /must be between 1 and 65535/,
  );
  assert.throws(
    () => validateConfig({ NODE_ENV: "development", PORT: "invalid-port" }),
    /Invalid integer/,
  );
});

test("Config Validation: Rejects invalid REDIS_URL protocol", () => {
  assert.throws(
    () => validateConfig({ NODE_ENV: "development", REDIS_URL: "http://127.0.0.1:6379" }),
    /must use redis:\/\/ or rediss:\/\//,
  );
});

// ============================================================================
// 3. Strict Production Validation & Secret Guards
// ============================================================================

test("Config Production: Fails fast when required production variables are missing", () => {
  assert.throws(
    () =>
      validateConfig({
        NODE_ENV: "production",
      }),
    /DATABASE_URL is required in production|JWT_SECRET is required in production|ADMIN_2FA_ENCRYPTION_KEY is required in production|OPENROUTESERVICE_API_KEY is required in production/,
  );
});

test("Config Production: Rejects weak, short, or placeholder secrets in production", () => {
  // Short JWT secret (< 32 chars)
  assert.throws(
    () =>
      validateConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/goride",
        JWT_SECRET: "short_secret",
        ADMIN_2FA_ENCRYPTION_KEY: "a_valid_32_char_encryption_key_123456",
        OPENROUTESERVICE_API_KEY: "valid_ors_key",
      }),
    /must be at least 32 characters in production/,
  );

  // Placeholder JWT secret
  assert.throws(
    () =>
      validateConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/goride",
        JWT_SECRET: "secret_123456789012345678901234567890",
        ADMIN_2FA_ENCRYPTION_KEY: "a_valid_32_char_encryption_key_123456",
        OPENROUTESERVICE_API_KEY: "valid_ors_key",
      }),
    /cannot be a default or placeholder value in production/,
  );

  // Short ADMIN_2FA_ENCRYPTION_KEY (< 32 chars)
  assert.throws(
    () =>
      validateConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/goride",
        JWT_SECRET: "valid_secure_production_jwt_secret_at_least_32_chars",
        ADMIN_2FA_ENCRYPTION_KEY: "too_short_key",
        OPENROUTESERVICE_API_KEY: "valid_ors_key",
      }),
    /must be at least 32 characters in production/,
  );
});

test("Config Production: Accepts valid, complete production configuration", () => {
  const prodConfig = validateConfig({
    NODE_ENV: "production",
    PORT: "4000",
    DATABASE_URL: "postgresql://postgres:prodpass@db.example.com:5432/goride_prod",
    JWT_SECRET: "a_very_secure_production_jwt_secret_string_32c",
    ADMIN_2FA_ENCRYPTION_KEY: "a_very_secure_production_admin_totp_key_32c",
    OPENROUTESERVICE_API_KEY: "prod_ors_api_token_value_abc123",
    CLOUDINARY_CLOUD_NAME: "goride-cloud",
    CLOUDINARY_API_KEY: "1234567890",
    CLOUDINARY_API_SECRET: "secret_cloudinary_value",
  });

  assert.equal(prodConfig.app.env, "production");
  assert.equal(prodConfig.app.isProduction, true);
  assert.equal(prodConfig.app.port, 4000);
  assert.equal(prodConfig.cloudinary.isConfigured, true);
});

// ============================================================================
// 4. Secret Redaction & Public Diagnostics Summary
// ============================================================================

test("Config Diagnostics: getPublicConfigSummary never exposes sensitive credentials", () => {
  const sampleConfig = validateConfig({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://super_secret_user:super_secret_pass@localhost:5432/db",
    JWT_SECRET: "super_secret_jwt_token_key_1234567890",
    ADMIN_2FA_ENCRYPTION_KEY: "super_secret_admin_totp_key_123456789",
    OPENROUTESERVICE_API_KEY: "super_secret_ors_api_key",
    CLOUDINARY_API_SECRET: "super_secret_cloudinary_secret",
    SMTP_PASS: "super_secret_smtp_password",
  });

  const summary = getPublicConfigSummary(sampleConfig);
  const summaryStr = JSON.stringify(summary);

  assert.equal(summaryStr.includes("super_secret_user"), false);
  assert.equal(summaryStr.includes("super_secret_pass"), false);
  assert.equal(summaryStr.includes("super_secret_jwt"), false);
  assert.equal(summaryStr.includes("super_secret_admin"), false);
  assert.equal(summaryStr.includes("super_secret_ors"), false);
  assert.equal(summaryStr.includes("super_secret_cloudinary"), false);
  assert.equal(summaryStr.includes("super_secret_smtp"), false);

  assert.equal(summary.database.configured, true);
  assert.equal(summary.jwt.configured, true);
  assert.equal(summary.admin2fa.configured, true);
  assert.equal(summary.maps.configured, true);
});

test("Config Error Safety: Validation errors do not print raw secret values", () => {
  try {
    validateConfig({
      NODE_ENV: "production",
      DATABASE_URL: "invalid_protocol://secret_user:secret_password@db.com:5432/goride",
      JWT_SECRET: "short_secret_with_hidden_pass",
      ADMIN_2FA_ENCRYPTION_KEY: "short_2fa_key",
      OPENROUTESERVICE_API_KEY: "secret_ors_key",
    });
    assert.fail("Should have thrown ConfigurationError");
  } catch (err) {
    assert.equal(err.name, "ConfigurationError");
    assert.equal(err.message.includes("secret_password"), false);
    assert.equal(err.message.includes("short_secret_with_hidden_pass"), false);
  }
});

// ============================================================================
// 5. Immutability & Subsystem Config Compatibility
// ============================================================================

test("Config Immutability: Top-level configuration object is frozen", () => {
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.app));
  assert.throws(
    () => {
      "use strict";
      config.app = { env: "hacked" };
    },
    /Cannot assign to read only property|not extensible|read-only/i,
  );
});
