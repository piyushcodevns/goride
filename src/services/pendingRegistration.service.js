/**
 * GoRide Pending Registration Service (Redis)
 * Stores pre-verification registration state outside PostgreSQL.
 * User record is ONLY created in PostgreSQL after successful OTP verification.
 */

const Redis = require("ioredis");
const hashToken = require("../utils/hashToken");
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");

const PENDING_REG_PREFIX = "goride:pending_reg:";
const PENDING_OTP_PREFIX = "goride:pending_otp:";
const PENDING_TTL_SECONDS = 900; // 15 minutes (matches OTP expiration)

let redisClient = null;

/**
 * Lazily initialize and return Redis client for pending registration operations.
 */
const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: (error) => {
      const msg = error?.message || "";
      return msg.includes("READONLY") || msg.includes("ECONNRESET");
    },
  });

  redisClient.on("error", (err) => {
    logger.error("Redis pending registration client error.", {
      error: err?.message,
    });
  });

  return redisClient;
};

/**
 * Ensure Redis client is connected before executing command.
 */
const ensureConnected = async () => {
  const client = getRedisClient();
  if (client.status === "ready" || client.status === "connecting" || client.status === "connect") {
    return client;
  }
  try {
    await client.connect();
    return client;
  } catch (err) {
    if (err?.message && err.message.includes("already connecting")) {
      return client;
    }
    logger.error("Failed to connect to Redis for pending registration.", {
      error: err?.message,
    });
    throw new AppError(
      "Registration service temporarily unavailable. Please try again later.",
      503
    );
  }
};

/**
 * Save a new pending registration in Redis with short-lived TTL.
 * Overwrites any existing pending registration for this email.
 */
const savePendingRegistration = async ({
  email,
  phone,
  fullName,
  password, // Already bcrypt-hashed
  otp,
  expiresAt,
}) => {
  const client = await ensureConnected();
  const normalizedEmail = email.trim().toLowerCase();
  const emailKey = `${PENDING_REG_PREFIX}${normalizedEmail}`;

  // If an old pending registration exists for this email, remove its old OTP index
  try {
    const existingRaw = await client.get(emailKey);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (existing?.otpHash) {
        await client.del(`${PENDING_OTP_PREFIX}${existing.otpHash}`);
      }
    }
  } catch (cleanupErr) {
    logger.warn("Minor issue cleaning up old pending OTP index.", {
      error: cleanupErr?.message,
    });
  }

  const otpHash = hashToken(otp);
  const otpKey = `${PENDING_OTP_PREFIX}${otpHash}`;

  const payload = JSON.stringify({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password, // Store bcrypt hash, never plaintext
    otpHash,
    expiresAt: expiresAt instanceof Date ? expiresAt.getTime() : expiresAt,
    createdAt: Date.now(),
    attempts: 0,
  });

  // Store primary pending object by email and secondary index by OTP hash
  await client.setex(emailKey, PENDING_TTL_SECONDS, payload);
  await client.setex(otpKey, PENDING_TTL_SECONDS, normalizedEmail);

  logger.info("Pending registration stored in Redis.", {
    email: normalizedEmail,
    ttlSeconds: PENDING_TTL_SECONDS,
  });

  return { email: normalizedEmail, otpHash };
};

/**
 * Retrieve pending registration by email.
 */
const getPendingRegistrationByEmail = async (email) => {
  if (!email) return null;
  const client = await ensureConnected();
  const normalizedEmail = email.trim().toLowerCase();
  const emailKey = `${PENDING_REG_PREFIX}${normalizedEmail}`;

  const raw = await client.get(emailKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Retrieve pending registration using 6-digit OTP.
 */
const getPendingRegistrationByOtp = async (otp) => {
  if (!otp) return null;
  const client = await ensureConnected();
  const otpHash = hashToken(otp);
  const otpKey = `${PENDING_OTP_PREFIX}${otpHash}`;

  const email = await client.get(otpKey);
  if (!email) return null;

  return getPendingRegistrationByEmail(email);
};

/**
 * Update OTP and reset TTL for an existing pending registration.
 */
const updatePendingOtp = async ({ email, newOtp, expiresAt }) => {
  const client = await ensureConnected();
  const normalizedEmail = email.trim().toLowerCase();
  const emailKey = `${PENDING_REG_PREFIX}${normalizedEmail}`;

  const pending = await getPendingRegistrationByEmail(normalizedEmail);
  if (!pending) return null;

  // Invalidate old OTP index
  if (pending.otpHash) {
    await client.del(`${PENDING_OTP_PREFIX}${pending.otpHash}`);
  }

  const newOtpHash = hashToken(newOtp);
  const newOtpKey = `${PENDING_OTP_PREFIX}${newOtpHash}`;

  pending.otpHash = newOtpHash;
  pending.expiresAt = expiresAt instanceof Date ? expiresAt.getTime() : expiresAt;
  pending.attempts = 0;

  await client.setex(emailKey, PENDING_TTL_SECONDS, JSON.stringify(pending));
  await client.setex(newOtpKey, PENDING_TTL_SECONDS, normalizedEmail);

  logger.info("Pending registration OTP refreshed in Redis.", {
    email: normalizedEmail,
  });

  return pending;
};

/**
 * Increment verification attempts on pending registration.
 * Deletes pending registration if attempts exceed threshold (brute-force guard).
 */
const incrementPendingAttempts = async (email) => {
  const client = await ensureConnected();
  const pending = await getPendingRegistrationByEmail(email);
  if (!pending) return;

  pending.attempts = (pending.attempts || 0) + 1;

  if (pending.attempts >= 5) {
    logger.warn("Pending registration deleted due to excessive failed OTP attempts.", {
      email,
    });
    await deletePendingRegistration(email, pending.otpHash);
    return;
  }

  const emailKey = `${PENDING_REG_PREFIX}${email.toLowerCase()}`;
  const ttl = await client.ttl(emailKey);
  if (ttl > 0) {
    await client.setex(emailKey, ttl, JSON.stringify(pending));
  }
};

/**
 * Delete pending registration from Redis once verified or invalidated.
 */
const deletePendingRegistration = async (email, otpHash = null) => {
  try {
    const client = await ensureConnected();
    const normalizedEmail = email?.trim()?.toLowerCase();

    if (normalizedEmail) {
      await client.del(`${PENDING_REG_PREFIX}${normalizedEmail}`);
    }

    if (otpHash) {
      await client.del(`${PENDING_OTP_PREFIX}${otpHash}`);
    }
  } catch (err) {
    logger.warn("Minor issue deleting pending registration from Redis.", {
      email,
      error: err?.message,
    });
  }
};

/**
 * Disconnect Redis client if needed (for clean test exits).
 */
const closePendingRegistrationClient = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
  }
};

module.exports = {
  savePendingRegistration,
  getPendingRegistrationByEmail,
  getPendingRegistrationByOtp,
  updatePendingOtp,
  incrementPendingAttempts,
  deletePendingRegistration,
  closePendingRegistrationClient,
  PENDING_TTL_SECONDS,
};
