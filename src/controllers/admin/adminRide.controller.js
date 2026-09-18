const {
  getRides,
  getRideDetails,
  getRideStatistics,
  getUserRides,
  getDriverRides,
  updateRideStatus,
  cancelRide,
  assignDriver,
  reassignDriver,
  forceCompleteRide,
  getRideTimeline,
  getRideLogs,
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

/**
 * Assign driver by admin.
 */
const assign = async (req, res, next) => {
  try {
    const result = await assignDriver({
      rideId: req.params.id,
      driverId: req.body.driverId,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver assigned successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reassign driver by admin.
 */
const reassign = async (req, res, next) => {
  try {
    const result = await reassignDriver({
      rideId: req.params.id,
      driverId: req.body.driverId,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver reassigned successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Force complete ride by admin.
 */
const forceComplete = async (req, res, next) => {
  try {
    const result = await forceCompleteRide({
      rideId: req.params.id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Ride force completed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride timeline.
 */
const getTimeline = async (req, res, next) => {
  try {
    const result = await getRideTimeline(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Ride timeline fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride logs.
 */
const getLogs = async (req, res, next) => {
  try {
    const result = await getRideLogs(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Ride logs fetched successfully.",
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
  assign,
  reassign,
  forceComplete,
  getTimeline,
  getLogs,
};
