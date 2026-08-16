const {
  getRides,
  getRideDetails,
  getRideStatistics,
  getUserRides,
  getDriverRides,
} = require("../../services/admin/adminRide.service");

/**
 * Get all rides.
 */
const getAllRides = async (req, res, next) => {
  try {
    const result = await getRides(req.query);

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

module.exports = {
  getAllRides,
  getRide,
  getStatistics,
  getRidesByUser,
  getRidesByDriver,
};