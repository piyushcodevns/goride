const paymentRepository = require("../repositories/payment.repository");
const rideRepository = require("../repositories/ride.repository");
const { AppError } = require("../utils/AppError");

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
    throw new AppError("Ride not found.", 404);
  }

  if (ride.userId !== userId) {
    throw new AppError("Unauthorized payment request.", 403);
  }

  if (ride.status !== "COMPLETED") {
    throw new AppError(
      "Payment can only be created after ride completion.",
      400
    );
  }

  const existingPayment =
    await paymentRepository.getPaymentByRideId(rideId);

  if (existingPayment) {
    throw new AppError("Payment already exists for this ride.", 409);
  }

  return paymentRepository.createPayment({
    rideId,
    userId,
    amount: ride.fare,
    paymentMethod,
    gateway,
  });
};

/**
 * Get Payment by Ride
 */
const getPaymentByRide = async (rideId) => {
  const payment = await paymentRepository.getPaymentByRideId(rideId);

  if (!payment) {
    throw new AppError("Payment not found.", 404);
  }

  return payment;
};

/**
 * Update Payment Status
 */
const updatePaymentStatus = async (
  paymentId,
  status,
  transactionId = null
) => {
  const payment = await paymentRepository.getPaymentById(paymentId);

  if (!payment) {
    throw new AppError("Payment not found.", 404);
  }

  if (
    payment.status === "SUCCESS" &&
    status !== "REFUNDED"
  ) {
    throw new AppError(
      "Successful payment cannot be modified.",
      400
    );
  }

  return paymentRepository.updatePaymentStatus(paymentId, {
    status,
    transactionId,
    paidAt: status === "SUCCESS" ? new Date() : payment.paidAt,
  });
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