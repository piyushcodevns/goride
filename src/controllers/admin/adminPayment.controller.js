const {
  getPayments,
  getPaymentDetails,
  getPaymentStatistics,
  updatePaymentStatus,
} = require("../../services/admin/adminPayment.service");

const {
  getPaymentsQuerySchema,
} = require("../../validators/admin/adminPayment.validator");

/**
 * Get all payments.
 */
const getAllPayments = async (req, res, next) => {
  try {
    const query =
      getPaymentsQuerySchema.parse(req.query);

    const result = await getPayments(query);

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
    const result = await getPaymentDetails(
      req.params.id,
    );

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
    const result =
      await getPaymentStatistics();

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
 * Update payment status.
 */
const updateStatus = async (req, res, next) => {
  try {
    const result =
      await updatePaymentStatus({
        paymentId: req.params.id,
        status: req.body.status,
        transactionId:
          req.body.transactionId,

        adminId: req.admin.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

    return res.status(200).json({
      success: true,
      message:
        "Payment status updated successfully.",
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
  updateStatus,
};