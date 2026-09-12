const rideService = require("../services/ride.service");
const { createRideSchema } = require("../validators/ride.validator");
const { getDriverByUserId } = require("../repositories/driver.repository");

/**
 * Create Ride
 */
const createRide = async (req, res) => {
  try {
    const validatedData = createRideSchema.parse(req.body);

    const ride = await rideService.createRide({
      ...validatedData,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Ride created successfully.",
      data: ride,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.errors,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Ride By ID
 */
const getRideById = async (req, res) => {
  try {
    const ride = await rideService.getRideByIdForUser(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Ride fetched successfully.",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Logged-in User Ride History
 */
const getMyRides = async (req, res) => {
  try {
    const rides = await rideService.getUserRides(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Ride history fetched successfully.",
      data: rides,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Available Rides For Driver
 */
const getAvailableRides = async (req, res) => {
  try {
    const driver = await getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
    }

    const rides = await rideService.getAvailableRides(driver.id);

    return res.status(200).json({
      success: true,
      message: "Available rides fetched successfully.",
      data: rides,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/**
 * Assign Driver
 */
const assignDriver = async (req, res) => {
  try {
    // Logged-in user se driver profile nikalo
    const driver = await getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
    }

    const ride = await rideService.assignDriver(req.params.id, driver.id);

    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully.",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Ride Status
 */
const updateRideStatus = async (req, res) => {
  try {
    const driver = await getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
    }

    const ride = await rideService.updateRideStatus(
      req.params.id,
      driver.id,
      req.body.status,
    );

    return res.status(200).json({
      success: true,
      message: "Ride status updated successfully.",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const cancelRide = async (req, res) => {
  try {
    const ride = await rideService.cancelRide(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully.",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reject Ride
 */
const rejectRide = async (req, res) => {
  try {
    const driver = await getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
    }

    const result = await rideService.rejectRide(req.params.id, driver.id);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Driver Current Ride
 */
const getDriverCurrentRide = async (req, res) => {
  try {
    const driver = await getDriverByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
    }

    const ride = await rideService.getDriverCurrentRide(driver.id);

    return res.status(200).json({
      success: true,
      message: "Current ride fetched successfully.",
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createRide,
  getRideById,
  getMyRides,
  getAvailableRides,
  assignDriver,
  updateRideStatus,
  cancelRide,
  rejectRide,
  getDriverCurrentRide,
};
