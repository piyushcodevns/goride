const analyticsService = require("../../services/admin/adminAnalytics.service");

const getAdminContext = (req) => ({
  adminId: req.admin.id,
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

/**
 * Get overall growth comparison analytics.
 */
const getGrowth = async (req, res, next) => {
  try {
    const result = await analyticsService.getGrowth(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user registration growth analytics.
 */
const getUserGrowth = async (req, res, next) => {
  try {
    const result = await analyticsService.getUserGrowth(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver registration growth analytics.
 */
const getDriverGrowth = async (req, res, next) => {
  try {
    const result = await analyticsService.getDriverGrowth(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get successful revenue growth analytics.
 */
const getRevenueGrowth = async (req, res, next) => {
  try {
    const result = await analyticsService.getRevenueGrowth(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride growth and operational analytics.
 */
const getRideGrowth = async (req, res, next) => {
  try {
    const result = await analyticsService.getRideGrowth(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vehicle analytics.
 */
const getVehicleAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getVehicleAnalytics(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride coordinate heatmap analytics.
 */
const getHeatmap = async (req, res, next) => {
  try {
    const result = await analyticsService.getHeatmap(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user retention analytics.
 */
const getRetention = async (req, res, next) => {
  try {
    const result = await analyticsService.getRetention(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get city analytics.
 */
const getCityAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getCityAnalytics(req.query, getAdminContext(req));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const exportAnalytics = async (req, res, next) => {
  try {
    const csv = await analyticsService.exportAnalyticsCsv(
      req.query,
      getAdminContext(req),
    );

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=goride-analytics.csv",
    );

    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGrowth,
  getUserGrowth,
  getDriverGrowth,
  getRevenueGrowth,
  getRideGrowth,
  getVehicleAnalytics,
  getHeatmap,
  getRetention,
  getCityAnalytics,
  exportAnalytics,
};
