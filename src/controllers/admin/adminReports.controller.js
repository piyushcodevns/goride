const {
  getOverviewReport,
  getRevenueReport,
  getRideReport,
  getUserReport,
  getDriverReport,
  getVehicleReport,
  getPaymentReport,
  getCouponReport,
  getOperationsReport,
} = require("../../services/admin/adminReports.service");

/**
 * Get Executive Overview Report.
 */
const getOverview = async (req, res, next) => {
  try {
    const result = await getOverviewReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Overview report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Revenue Analytics Report.
 */
const getRevenue = async (req, res, next) => {
  try {
    const result = await getRevenueReport(req.query);

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
 * Get Ride Analytics Report.
 */
const getRides = async (req, res, next) => {
  try {
    const result = await getRideReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Ride report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Analytics Report.
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await getUserReport(req.query);

    return res.status(200).json({
      success: true,
      message: "User report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Driver Analytics Report.
 */
const getDrivers = async (req, res, next) => {
  try {
    const result = await getDriverReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Driver report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Vehicle Analytics Report.
 */
const getVehicles = async (req, res, next) => {
  try {
    const result = await getVehicleReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Vehicle report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment Analytics Report.
 */
const getPayments = async (req, res, next) => {
  try {
    const result = await getPaymentReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Payment report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Coupon Analytics Report.
 */
const getCoupons = async (req, res, next) => {
  try {
    const result = await getCouponReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Coupon report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Operational Analytics Report.
 */
const getOperations = async (req, res, next) => {
  try {
    const result = await getOperationsReport(req.query);

    return res.status(200).json({
      success: true,
      message: "Operations report fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getRevenue,
  getRides,
  getUsers,
  getDrivers,
  getVehicles,
  getPayments,
  getCoupons,
  getOperations,
};
