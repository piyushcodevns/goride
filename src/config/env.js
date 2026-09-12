/**
 * GoRide Centralized Configuration & Environment Layer
 * Deterministic parsing, Zod validation, type normalization, and secret protection.
 */

const { z } = require("zod");
const path = require("path");

// ============================================================================
// Safe Type Parsers & Transformers
// ============================================================================

const parseBoolean = (val, defaultValue = false) => {
  if (val === undefined || val === null || val === "") return defaultValue;
  if (typeof val === "boolean") return val;
  const str = String(val).trim().toLowerCase();
  if (str === "true" || str === "1" || str === "yes") return true;
  if (str === "false" || str === "0" || str === "no") return false;
  throw new Error(`Invalid boolean value: "${val}"`);
};

const parseInteger = (val, defaultValue, min = -Infinity, max = Infinity) => {
  if (val === undefined || val === null || val === "") {
    if (defaultValue !== undefined) return defaultValue;
    return undefined;
  }
  const num = Number(val);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`Invalid integer (must be between ${min} and ${max}): "${val}"`);
  }
  return num;
};

const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
};

// ============================================================================
// Raw Environment Schema
// ============================================================================

const createEnvSchema = (isProd) =>
  z.object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5000, 1, 65535)),

    // Database
    DATABASE_URL: isProd
      ? z
          .string({ message: "DATABASE_URL is required in production." })
          .min(1, "DATABASE_URL cannot be empty.")
          .refine(
            (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
            "DATABASE_URL must be a valid PostgreSQL connection string.",
          )
      : z
          .string()
          .optional()
          .default("postgresql://postgres:root@localhost:5432/goride_db"),

    // JWT & Security
    JWT_SECRET: isProd
      ? z
          .string({ message: "JWT_SECRET is required in production." })
          .min(32, "JWT_SECRET must be at least 32 characters in production.")
          .refine(
            (s) => !/^(secret|test|changeme|password|12345678|default)/i.test(s),
            "JWT_SECRET cannot be a default or placeholder value in production.",
          )
      : z.string().optional().default("goride_dev_jwt_secret_key_minimum_32_chars"),
    JWT_ISSUER: z.string().default("goride"),
    JWT_AUDIENCE: z.string().default("goride-api"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    ADMIN_2FA_ENCRYPTION_KEY: isProd
      ? z
          .string({ message: "ADMIN_2FA_ENCRYPTION_KEY is required in production." })
          .min(32, "ADMIN_2FA_ENCRYPTION_KEY must be at least 32 characters in production.")
          .refine(
            (k) => !/^(secret|test|changeme|password|12345678|default)/i.test(k),
            "ADMIN_2FA_ENCRYPTION_KEY cannot be a placeholder in production.",
          )
      : z.string().optional().default("goride_dev_admin_2fa_encryption_key_32c"),

    BCRYPT_SALT_ROUNDS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 12, 10, 16)),

    // Redis & BullMQ
    REDIS_URL: z
      .string()
      .default("redis://127.0.0.1:6379")
      .refine(
        (url) => url.startsWith("redis://") || url.startsWith("rediss://"),
        "REDIS_URL must use redis:// or rediss:// protocol.",
      ),
    QUEUE_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, true)),
    NOTIFICATION_QUEUE_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, true)),

    // Schedulers & Workers
    SCHEDULED_RIDES_SCHEDULE_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, true)),
    CLEANUP_SCHEDULE_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, true)),
    BACKUP_SCHEDULE_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, false)),

    SCHEDULED_RIDES_CRON: z.string().default("* * * * *"),
    CLEANUP_CRON: z.string().default("0 3 * * *"),
    BACKUP_CRON: z.string().default("0 2 * * *"),

    SCHEDULED_RIDE_CONCURRENCY: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5, 1, 50)),
    DATASET_CONCURRENCY: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5, 1, 50)),
    WORKER_CONCURRENCY: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5, 1, 50)),
    WORKER_STANDALONE: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, false)),

    // Maps (OpenRouteService)
    OPENROUTESERVICE_API_KEY: isProd
      ? z.string({ message: "OPENROUTESERVICE_API_KEY is required in production." }).min(1)
      : z.string().optional().default("test_ors_api_key"),
    OPENROUTESERVICE_BASE_URL: z.string().url().default("https://api.openrouteservice.org"),
    MAPS_REQUEST_TIMEOUT_MS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 10000, 1000, 60000)),
    MAPS_MAX_RETRIES: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 2, 0, 5)),
    MAPS_CACHE_TTL: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 300, 10, 86400)),
    MAPS_RATE_LIMIT_BUFFER: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5, 0, 100)),
    MAPS_ROUTE_CACHE_TTL_MS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 60 * 60 * 1000, 1000)),
    MAPS_GEOCODE_CACHE_TTL_MS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 24 * 60 * 60 * 1000, 1000)),

    // Cloudinary Storage
    CLOUDINARY_CLOUD_NAME: isProd ? z.string().min(1).optional() : z.string().optional(),
    CLOUDINARY_API_KEY: isProd ? z.string().min(1).optional() : z.string().optional(),
    CLOUDINARY_API_SECRET: isProd ? z.string().min(1).optional() : z.string().optional(),

    // Email / SMTP
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 587, 1, 65535)),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional().default("GoRide <noreply@goride.com>"),

    // Observability & Logging
    LOG_LEVEL: z
      .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
      .default("info"),
    LOG_FORMAT: z.enum(["combined", "json"]).default("combined"),
    ENABLE_TEST_LOGS: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, false)),

    // CORS & Swagger
    CORS_ALLOWED_ORIGINS: z.string().default(""),
    SWAGGER_ENABLED: z
      .string()
      .optional()
      .transform((val) => parseBoolean(val, false)),

    // Backup
    BACKUP_DIR: z.string().default("backups"),
    BACKUP_RETENTION_DAYS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 30, 1, 365)),
    BACKUP_MAX_SIZE_MB: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 2048, 10, 51200)),
    PG_DUMP_PATH: z.string().default("pg_dump"),
    PG_RESTORE_PATH: z.string().default("pg_restore"),

    // In-Memory Caching & Performance
    CACHE_TTL_MS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5 * 60 * 1000, 1000)),
    CACHE_MAX_ENTRIES: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5000, 10, 100000)),
    ANALYTICS_CACHE_TTL_MS: z
      .string()
      .optional()
      .transform((val) => parseInteger(val, 5 * 60 * 1000, 1000)),

    // AI / ML
    GORIDE_ML_ARTIFACT_DIR: z.string().default(path.join("ml", "artifacts")),
  });

// ============================================================================
// Validation & Normalization Engine
// ============================================================================

/**
 * Validate given environment and return clean, structured, typed configuration.
 * Never prints raw secret values on validation error.
 *
 * @param {Object} rawEnv - Key-value environment pairs (defaults to process.env)
 * @returns {Object} Structured, immutable configuration object
 */
const validateConfig = (rawEnv = process.env) => {
  const isProd = rawEnv.NODE_ENV === "production";
  const schema = createEnvSchema(isProd);

  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const errorMessages = issues.map((err) => {
      const field = Array.isArray(err.path) ? err.path.join(".") : String(err.path || "unknown");
      const isSensitive = /(secret|pass|token|key|url|credential)/i.test(field);
      return isSensitive
        ? `Field '${field}': ${err.message}`
        : `Field '${field}': ${err.message}`;
    });

    const formattedError = new Error(
      `Configuration validation failed:\n  - ${errorMessages.join("\n  - ")}`,
    );
    formattedError.name = "ConfigurationError";
    throw formattedError;
  }

  const data = result.data;

  // Build structured, organized, typed configuration
  const config = {
    app: {
      env: data.NODE_ENV,
      isProduction: data.NODE_ENV === "production",
      isDevelopment: data.NODE_ENV === "development",
      isTest: data.NODE_ENV === "test",
      port: data.PORT,
    },
    database: {
      url: data.DATABASE_URL,
    },
    jwt: {
      secret: data.JWT_SECRET,
      issuer: data.JWT_ISSUER,
      audience: data.JWT_AUDIENCE,
      expiresIn: data.JWT_EXPIRES_IN,
    },
    security: {
      admin2faEncryptionKey: data.ADMIN_2FA_ENCRYPTION_KEY,
      bcryptSaltRounds: data.BCRYPT_SALT_ROUNDS,
      corsAllowedOrigins: data.CORS_ALLOWED_ORIGINS
        ? data.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      swaggerEnabled: data.SWAGGER_ENABLED,
    },
    redis: {
      url: data.REDIS_URL,
      queueEnabled: data.NODE_ENV === "test" ? false : data.QUEUE_ENABLED,
      notificationQueueEnabled:
        data.NODE_ENV === "test" ? false : data.NOTIFICATION_QUEUE_ENABLED,
    },
    schedulers: {
      scheduledRides: {
        enabled: data.SCHEDULED_RIDES_SCHEDULE_ENABLED,
        cron: data.SCHEDULED_RIDES_CRON,
      },
      cleanup: {
        enabled: data.CLEANUP_SCHEDULE_ENABLED,
        cron: data.CLEANUP_CRON,
      },
      backup: {
        enabled: data.BACKUP_SCHEDULE_ENABLED,
        cron: data.BACKUP_CRON,
      },
    },
    workers: {
      scheduledRideConcurrency: data.SCHEDULED_RIDE_CONCURRENCY,
      datasetConcurrency: data.DATASET_CONCURRENCY,
      defaultConcurrency: data.WORKER_CONCURRENCY,
      isStandalone: data.WORKER_STANDALONE,
    },
    maps: {
      provider: "openrouteservice",
      apiKey: data.OPENROUTESERVICE_API_KEY,
      baseUrl: data.OPENROUTESERVICE_BASE_URL,
      timeoutMs: data.MAPS_REQUEST_TIMEOUT_MS,
      maxRetries: data.MAPS_MAX_RETRIES,
      cacheTtlSeconds: data.MAPS_CACHE_TTL,
      rateLimitBuffer: data.MAPS_RATE_LIMIT_BUFFER,
      routeCacheTtlMs: data.MAPS_ROUTE_CACHE_TTL_MS,
      geocodeCacheTtlMs: data.MAPS_GEOCODE_CACHE_TTL_MS,
    },
    cloudinary: {
      cloudName: data.CLOUDINARY_CLOUD_NAME,
      apiKey: data.CLOUDINARY_API_KEY,
      apiSecret: data.CLOUDINARY_API_SECRET,
      isConfigured: Boolean(
        data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
      ),
    },
    mail: {
      host: data.SMTP_HOST,
      port: data.SMTP_PORT,
      secure: data.SMTP_PORT === 465,
      user: data.SMTP_USER,
      pass: data.SMTP_PASS,
      from: data.EMAIL_FROM,
      isConfigured: Boolean(data.SMTP_HOST && data.SMTP_USER && data.SMTP_PASS),
    },
    logging: {
      level: data.LOG_LEVEL,
      format: data.LOG_FORMAT,
      enableTestLogs: data.ENABLE_TEST_LOGS,
    },
    backup: {
      root: path.resolve(data.BACKUP_DIR),
      retentionDays: data.BACKUP_RETENTION_DAYS,
      maxSizeMb: data.BACKUP_MAX_SIZE_MB,
      pgDumpPath: data.PG_DUMP_PATH,
      pgRestorePath: data.PG_RESTORE_PATH,
    },
    cache: {
      defaultTtlMs: data.CACHE_TTL_MS,
      maxEntries: data.CACHE_MAX_ENTRIES,
      analyticsTtlMs: data.ANALYTICS_CACHE_TTL_MS,
    },
    ai: {
      artifactDir: path.resolve(data.GORIDE_ML_ARTIFACT_DIR),
    },
  };

  return deepFreeze(config);
};

/**
 * Return a safe, public diagnostics summary with zero secrets exposed.
 * Suitable for logging upon startup.
 */
const getPublicConfigSummary = (config) => ({
  environment: config.app.env,
  port: config.app.port,
  database: {
    configured: Boolean(config.database.url),
  },
  jwt: {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    configured: Boolean(config.jwt.secret),
  },
  admin2fa: {
    configured: Boolean(config.security.admin2faEncryptionKey),
  },
  redis: {
    configured: Boolean(config.redis.url),
    queueEnabled: config.redis.queueEnabled,
  },
  maps: {
    provider: config.maps.provider,
    configured: Boolean(config.maps.apiKey),
  },
  cloudinary: {
    configured: config.cloudinary.isConfigured,
  },
  mail: {
    configured: config.mail.isConfigured,
  },
  logging: {
    level: config.logging.level,
    format: config.logging.format,
  },
  schedulers: {
    scheduledRides: config.schedulers.scheduledRides.enabled,
    cleanup: config.schedulers.cleanup.enabled,
    backup: config.schedulers.backup.enabled,
  },
});

// Primary global singleton configuration
const config = validateConfig();

module.exports = {
  config,
  validateConfig,
  getPublicConfigSummary,
  parseBoolean,
  parseInteger,
};
