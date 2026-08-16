const {
  findRides,
  findRideById,
  findRidesByUserId,
  findRidesByDriverId,
  getRideStats,
} = require("../../repositories/admin/adminRide.repository");

const { NotFoundError } = require("../../utils/AppError");

/**
 * Get paginated rides.
 */
const getRides = async (filters = {}) => {
  return findRides(filters);
};

/**
 * Get complete ride details.
 */
const getRideDetails = async (rideId) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  return ride;
};

/**
 * Get ride statistics.
 */
const getRideStatistics = async () => {
  return getRideStats();
};

/**
 * Get rides by user.
 */
const getUserRides = async (userId, pagination = {}) => {
  return findRidesByUserId(userId, pagination);
};

/**
 * Get rides by driver.
 */
const getDriverRides = async (driverId, pagination = {}) => {
  return findRidesByDriverId(driverId, pagination);
};

module.exports = {
  getRides,
  getRideDetails,
  getRideStatistics,
  getUserRides,
  getDriverRides,
};