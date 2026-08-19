const {
  findRides,
  findRideById,
  findRidesByUserId,
  findRidesByDriverId,
  getRideStats,
  updateRideWithAudit,
} = require("../../repositories/admin/adminRide.repository");

const { NotFoundError, ConflictError } = require("../../utils/AppError");

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

/**
 * Valid admin ride status transitions.
 *
 * Existing ride lifecycle:
 *
 * REQUESTED -> ACCEPTED / CANCELLED
 * ACCEPTED  -> ARRIVED / CANCELLED
 * ARRIVED   -> STARTED / CANCELLED
 * STARTED   -> COMPLETED / CANCELLED
 * COMPLETED -> no transition
 * CANCELLED -> no transition
 */
const ADMIN_RIDE_STATUS_TRANSITIONS = Object.freeze({
  REQUESTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
});

/**
 * Update ride status by admin.
 */
const updateRideStatus = async ({
  rideId,
  status,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.status === status) {
    throw new ConflictError(`Ride is already ${status}.`);
  }

  const allowedTransitions = ADMIN_RIDE_STATUS_TRANSITIONS[ride.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new ConflictError(
      `Ride cannot be changed from ${ride.status} to ${status}.`,
    );
  }

  const updatedRide = await updateRideWithAudit({
    rideId,
    data: {
      status,
    },

    auditLog: {
      adminId,
      action: "UPDATE",
      entity: "RIDE",
      entityId: rideId,
      metadata: {
        previousStatus: ride.status,
        newStatus: status,
      },
      ipAddress,
      userAgent,
    },
  });

  return updatedRide;
};

/**
 * Cancel ride by admin.
 */
const cancelRide = async ({ rideId, adminId, ipAddress, userAgent }) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.status === "CANCELLED") {
    throw new ConflictError("Ride is already cancelled.");
  }

  if (ride.status === "COMPLETED") {
    throw new ConflictError("Completed ride cannot be cancelled.");
  }

  const updatedRide = await updateRideWithAudit({
    rideId,
    data: {
      status: "CANCELLED",
    },

    auditLog: {
      adminId,
      action: "CANCEL",
      entity: "RIDE",
      entityId: rideId,
      metadata: {
        previousStatus: ride.status,
        newStatus: "CANCELLED",
      },
      ipAddress,
      userAgent,
    },
  });

  return updatedRide;
};

module.exports = {
  getRides,
  getRideDetails,
  getRideStatistics,
  getUserRides,
  getDriverRides,
  updateRideStatus,
  cancelRide,
};
