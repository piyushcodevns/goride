const {
  findPayments,
  findPaymentById,
  getPaymentStats,
  updatePaymentWithAudit,
  findPaymentByTransactionId,
} = require("../../repositories/admin/adminPayment.repository");

const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require("../../utils/AppError");

/**
 * Allowed admin payment status transitions.
 *
 * PENDING -> PROCESSING / FAILED
 * PROCESSING -> SUCCESS / FAILED
 * SUCCESS -> REFUNDED
 */
const ADMIN_PAYMENT_STATUS_TRANSITIONS = Object.freeze({
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCESS", "FAILED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
});

/**
 * Get payments.
 */
const getPayments = async (filters = {}) => {
  return findPayments(filters);
};

/**
 * Get payment details.
 */
const getPaymentDetails = async (paymentId) => {
  const payment = await findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  return payment;
};

/**
 * Get payment statistics.
 */
const getPaymentStatistics = async () => {
  return getPaymentStats();
};

/**
 * Update payment status.
 */
const updatePaymentStatus = async ({
  paymentId,
  status,
  transactionId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const payment = await findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  if (payment.status === status) {
    throw new ConflictError(
      `Payment is already ${status}.`,
    );
  }

  const allowedTransitions =
    ADMIN_PAYMENT_STATUS_TRANSITIONS[payment.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new BadRequestError(
      `Payment cannot be changed from ${payment.status} to ${status}.`,
    );
  }

  const sanitizedTransactionId =
    transactionId?.trim() || null;

  if (status === "SUCCESS" && !sanitizedTransactionId) {
    throw new BadRequestError(
      "Transaction ID is required for successful payment.",
    );
  }

  if (sanitizedTransactionId) {
    const existingPayment =
      await findPaymentByTransactionId(
        sanitizedTransactionId,
      );

    if (
      existingPayment &&
      existingPayment.id !== payment.id
    ) {
      throw new ConflictError(
        "Transaction ID already exists.",
      );
    }
  }

  const data = {
    status,
  };

  if (sanitizedTransactionId) {
    data.transactionId = sanitizedTransactionId;
  }

  if (
    status === "SUCCESS" &&
    !payment.paidAt
  ) {
    data.paidAt = new Date();
  }

  if (status === "REFUNDED") {
    data.paidAt = payment.paidAt;
  }

  return updatePaymentWithAudit({
    paymentId,
    data,

    auditLog: {
      adminId,
      action: "UPDATE",
      entity: "PAYMENT",
      entityId: paymentId,

      metadata: {
        previousStatus: payment.status,
        newStatus: status,
        previousTransactionId:
          payment.transactionId,
        newTransactionId:
          sanitizedTransactionId ||
          payment.transactionId,
      },

      ipAddress,
      userAgent,
    },
  });
};

module.exports = {
  getPayments,
  getPaymentDetails,
  getPaymentStatistics,
  updatePaymentStatus,
};