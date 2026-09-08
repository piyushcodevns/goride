const paymentRepository = require("../repositories/payment.repository");
const rideRepository = require("../repositories/ride.repository");
const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../utils/AppError");

/**
 * Allowed Payment Status Flow
 */
const PAYMENT_STATUS_FLOW = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCESS", "FAILED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

/**
 * Create Payment for Completed Ride
 */
const createPayment = async ({
  rideId,
  userId,
  paymentMethod,
  gateway = null,
}) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new ForbiddenError("Unauthorized payment request.");
  }

  if (ride.status !== "COMPLETED") {
    throw new BadRequestError(
      "Payment can only be created after ride completion.",
    );
  }

  const existingPayment = await paymentRepository.getPaymentByRideId(rideId);

  if (existingPayment) {
    throw new ConflictError("Payment already exists for this ride.");
  }

  if (
    ride.finalFare === null ||
    ride.finalFare === undefined ||
    Number(ride.finalFare) <= 0
  ) {
    throw new BadRequestError("Invalid ride fare. Payment cannot be created.");
  }

  return paymentRepository.createPayment({
    rideId,
    userId,
    amount: ride.finalFare,
    paymentMethod,
    gateway,
  });
};

/**
 * Get Payment by Ride
 */
const getPaymentByRide = async (rideId, currentUser) => {
  const payment = await paymentRepository.getPaymentByRideId(rideId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  if (payment.userId !== currentUser.id) {
    throw new ForbiddenError("You are not authorized to access this payment.");
  }

  return payment;
};

/**
 * Update Payment Status
 */
const updatePaymentStatus = async (paymentId, status, transactionId = null) => {
  const sanitizedTransactionId = transactionId?.trim() || null;
  const payment = await paymentRepository.getPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  const allowedTransitions = PAYMENT_STATUS_FLOW[payment.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new BadRequestError(
      `Invalid payment status transition from ${payment.status} to ${status}.`,
    );
  }

  // Transaction ID is mandatory only for SUCCESS
  if (status === "SUCCESS" && !sanitizedTransactionId) {
    throw new BadRequestError(
      "Transaction ID is required for successful payment.",
    );
  }

  // Prevent duplicate transaction IDs
  if (sanitizedTransactionId) {
    const existingTransaction =
      await paymentRepository.getPaymentByTransactionId(sanitizedTransactionId);

    if (existingTransaction && existingTransaction.id !== payment.id) {
      throw new ConflictError("Transaction ID already exists.");
    }
  }

  const updateData = {
    status,
  };

  // Preserve original transactionId unless a new one is explicitly provided
  if (sanitizedTransactionId) {
    updateData.transactionId = sanitizedTransactionId;
  }

  if (status === "SUCCESS" && !payment.paidAt) {
    updateData.paidAt = new Date();
  }

  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentId,
    updateData,
  );

  if (status === "SUCCESS") {
    await notificationService.dispatchNotification(
      NotificationFactory.createPaymentSuccessNotification(updatedPayment),
    );
  }

  if (status === "FAILED") {
    await notificationService.dispatchNotification(
      NotificationFactory.createPaymentFailedNotification(updatedPayment),
    );
  }

  return updatedPayment;
};

/**
 * User Payment History
 */
const getMyPayments = async (userId) => {
  return paymentRepository.getUserPayments(userId);
};

module.exports = {
  createPayment,
  getPaymentByRide,
  updatePaymentStatus,
  getMyPayments,
};
