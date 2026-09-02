const {
  getPayments,
  getPaymentDetails,
  getPaymentStatistics,
  getRevenueReports,
  updatePaymentStatus,
  retryPayment,
  refundPayment,
} = require("../../services/admin/adminPayment.service");

/**
 * Get all payments.
 */
const getAllPayments = async (req, res, next) => {
  try {
    const result = await getPayments(req.query);

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment details.
 */
const getPayment = async (req, res, next) => {
  try {
    const result = await getPaymentDetails(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Payment details fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment statistics.
 */
const getStatistics = async (req, res, next) => {
  try {
    const result = await getPaymentStatistics();

    return res.status(200).json({
      success: true,
      message: "Payment statistics fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue report.
 */
const getRevenueReport = async (req, res, next) => {
  try {
    const result = await getRevenueReports(req.query);

    return res.status(200).json({
      success: true,
      message: "Revenue report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment status.
 */
const updateStatus = async (req, res, next) => {
  try {
    const result = await updatePaymentStatus({
      paymentId: req.params.id,
      status: req.body.status,
      transactionId: req.body.transactionId,

      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry failed payment.
 */
const retry = async (req, res, next) => {
  try {
    const result = await retryPayment({
      paymentId: req.params.id,

      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Payment retry initiated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refund successful payment.
 */
const refund = async (req, res, next) => {
  try {
    const result = await refundPayment({
      paymentId: req.params.id,

      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Payment refunded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPayment,
  getStatistics,
  getRevenueReport,
  updateStatus,
  retry,
  refund,
};
