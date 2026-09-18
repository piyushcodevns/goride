const healthService = require("../services/health.service");

/**
 * Liveness probe handler.
 */
const getLiveness = (req, res) => {
  const data = healthService.getLiveness();
  return res.status(200).json({
    success: true,
    message: "Application is alive.",
    data,
  });
};

/**
 * Readiness probe handler.
 */
const getReadiness = async (req, res, next) => {
  try {
    const data = await healthService.getReadiness();
    const statusCode = data.ready ? 200 : 503;

    return res.status(statusCode).json({
      success: data.ready,
      message: data.ready
        ? "Application is ready to accept traffic."
        : "Application dependencies are unavailable.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System health summary handler.
 */
const getHealth = async (req, res, next) => {
  try {
    const data = await healthService.getHealthSummary();
    const statusCode = data.ready ? 200 : 200; // Returns 200 summary with internal degraded flag

    return res.status(statusCode).json({
      success: true,
      message: "Health summary fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiveness,
  getReadiness,
  getHealth,
};
