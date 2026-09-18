const dashboardService = require("../../services/admin/adminDashboard.service");

const getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await dashboardService.getDashboardData();
    res.status(200).json({
      success: true,
      message: "Admin dashboard fetched successfully.",
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};