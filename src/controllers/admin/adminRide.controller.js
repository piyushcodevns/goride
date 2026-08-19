const {
  getRides,
  getRideDetails,
  getRideStatistics,
  getUserRides,
  getDriverRides,
  updateRideStatus,
  cancelRide,
} = require("../../services/admin/adminRide.service");

const {
  getRidesQuerySchema,
} = require("../../validators/admin/adminRide.validator");

/**
 * Get all rides.
 */
const getAllRides = async (req, res, next) => {
  try {
    const query = getRidesQuerySchema.parse(req.query);

    const result = await getRides(query);

    return res.status(200).json({
      success: true,
      message: "Rides fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride details.
 */
const getRide = async (req, res, next) => {
  try {
    const result = await getRideDetails(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Ride details fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride statistics.
 */
const getStatistics = async (req, res, next) => {
  try {
    const result = await getRideStatistics();

    return res.status(200).json({
      success: true,
      message: "Ride statistics fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rides by user.
 */
const getRidesByUser = async (req, res, next) => {
  try {
    const result = await getUserRides(req.params.userId, req.query);

    return res.status(200).json({
      success: true,
      message: "User rides fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rides by driver.
 */
const getRidesByDriver = async (req, res, next) => {
  try {
    const result = await getDriverRides(req.params.driverId, req.query);

    return res.status(200).json({
      success: true,
      message: "Driver rides fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ride status.
 */
const updateStatus = async (req, res, next) => {
  try {
    const result = await updateRideStatus({
      rideId: req.params.id,
      status: req.body.status,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Ride status updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel ride by admin.
 */
const cancel = async (req, res, next) => {
  try {
    const result = await cancelRide({
      rideId: req.params.id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRides,
  getRide,
  getStatistics,
  getRidesByUser,
  getRidesByDriver,
  updateStatus,
  cancel,
};
