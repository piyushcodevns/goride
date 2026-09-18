const crypto = require("crypto");
const Razorpay = require("razorpay");
const { config } = require("../config/env");
const logger = require("../utils/logger");
const { BadRequestError } = require("../utils/AppError");

let razorpayClient = null;

/**
 * Get or initialize singleton Razorpay SDK client.
 */
const getRazorpayClient = () => {
  if (razorpayClient) {
    return razorpayClient;
  }

  const keyId = config.razorpay?.keyId;
  const keySecret = config.razorpay?.keySecret;

  if (!keyId || !keySecret) {
    throw new BadRequestError(
      "Razorpay gateway is not configured with credentials."
    );
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
};

/**
 * Allow injection of custom/mock client for unit tests.
 */
const setRazorpayClient = (client) => {
  razorpayClient = client;
};

/**
 * Reset client back to default.
 */
const resetRazorpayClient = () => {
  razorpayClient = null;
};

/**
 * Create Razorpay Order
 * @param {Object} params
 * @param {number} params.amountPaise - Amount in smallest currency sub-unit (paise for INR)
 * @param {string} [params.currency="INR"]
 * @param {string} [params.receipt]
 * @param {Object} [params.notes]
 * @returns {Promise<Object>} Razorpay order entity
 */
const createOrder = async ({ amountPaise, currency = "INR", receipt, notes = {} }) => {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new BadRequestError("Invalid order amount in paise.");
  }

  const keyId = config.razorpay?.keyId;
  const keySecret = config.razorpay?.keySecret;

  // Offline test harness fallback when running tests with mock credentials
  if (
    process.env.NODE_ENV === "test" &&
    (!keyId || !keySecret || keyId.includes("mock") || keySecret.includes("mock"))
  ) {
    return {
      id: `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entity: "order",
      amount: amountPaise,
      currency,
      receipt: receipt ? String(receipt).slice(0, 40) : undefined,
      status: "created",
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  const client = getRazorpayClient();

  try {
    const order = await client.orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt ? String(receipt).slice(0, 40) : undefined,
      notes,
    });

    return order;
  } catch (error) {
    logger.error("Razorpay order creation failed", {
      amountPaise,
      receipt,
      error: error.message,
    });
    throw new BadRequestError(
      `Failed to create payment order with gateway: ${error.message || "Gateway error"}`
    );
  }
};

/**
 * Verify Razorpay Payment Signature
 * Signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 * Uses crypto.timingSafeEqual to defend against timing attacks.
 */
const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  secret = config.razorpay?.keySecret,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  if (!secret) {
    logger.warn("Cannot verify payment signature: Razorpay secret is not configured.");
    return false;
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const generatedBuffer = Buffer.from(generatedSignature, "utf8");
  const receivedBuffer = Buffer.from(razorpaySignature, "utf8");

  if (generatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
};

/**
 * Verify Razorpay Webhook Signature
 * Signature = HMAC-SHA256(rawBody, webhookSecret)
 * Uses crypto.timingSafeEqual to defend against timing attacks.
 */
const verifyWebhookSignature = ({
  rawBody,
  signature,
  secret = config.razorpay?.webhookSecret,
}) => {
  if (!rawBody || !signature) {
    return false;
  }

  if (!secret) {
    logger.warn("Cannot verify webhook signature: Razorpay webhook secret is not configured.");
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(bodyBuffer)
    .digest("hex");

  const generatedBuffer = Buffer.from(generatedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (generatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
};

module.exports = {
  getRazorpayClient,
  setRazorpayClient,
  resetRazorpayClient,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
