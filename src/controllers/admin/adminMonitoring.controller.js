const monitoringService = require("../../services/admin/adminMonitoring.service");

const getSystemStatus = async (req, res, next) => {
  try {
    const data = await monitoringService.getSystemStatus();

    return res.status(200).json({
      success: true,
      message: "System monitoring status fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getHealthCheck = async (req, res, next) => {
  try {
    const data = await monitoringService.getHealthCheck();

    return res.status(data.healthy ? 200 : 503).json({
      success: data.healthy,
      message: data.healthy
        ? "System health check passed."
        : "System health check failed.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getFailedJobs = async (req, res, next) => {
  try {
    const data = await monitoringService.getFailedJobs();

    return res.status(200).json({
      success: true,
      message: "Failed jobs fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemStatus,
  getHealthCheck,
  getFailedJobs,
};
