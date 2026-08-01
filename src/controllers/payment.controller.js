const paymentService = require("../services/payment.service");

/**
 * Create Payment
 */
const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment({
      rideId: req.body.rideId,
      userId: req.user.id,
      paymentMethod: req.body.paymentMethod,
      gateway: req.body.gateway,
    });

    return res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment By Ride
 */
const getPaymentByRide = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentByRide(
      req.params.rideId,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Payment Status
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePaymentStatus(
      req.params.id,
      req.body.status,
      req.body.transactionId
    );

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Payment History
 */
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getMyPayments(req.user.id);

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPaymentByRide,
  updatePaymentStatus,
  getMyPayments,
};