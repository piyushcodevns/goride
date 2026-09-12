const {
  findRides,
  findRideById,
  findRidesByUserId,
  findRidesByDriverId,
  getRideStats,
  updateRideWithAudit,
  assignDriverWithAudit,
  reassignDriverWithAudit,
  forceCompleteRideWithAudit,
  adminRideInclude,
} = require("../../repositories/admin/adminRide.repository");

const prisma = require("../../config/prisma");

const {
  getDriverById,
  updateDriverAvailability,
} = require("../../repositories/driver.repository");

const {
  getActiveRideByDriverId,
} = require("../../repositories/ride.repository");

const notificationService = require("../notification.service");
const NotificationFactory = require("../../factories/notification.factory");

const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require("../../utils/AppError");

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
 * Admin status transitions.
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

  const allowedTransitions =
    ADMIN_RIDE_STATUS_TRANSITIONS[ride.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new ConflictError(
      `Ride cannot be changed from ${ride.status} to ${status}.`,
    );
  }

  return updateRideWithAudit({
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

  return prisma.$transaction(async (tx) => {
    const cancelledRide = await tx.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        ...adminRideInclude,
      },
    });

    if (ride.driverId) {
      await updateDriverAvailability(ride.driverId, "AVAILABLE", tx);
    }

    await tx.auditLog.create({
      data: {
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

    await notificationService.dispatchNotification(
      NotificationFactory.createRideCancelledNotification({
        userId: ride.userId,
        rideId: ride.id,
        pickup: ride.pickup,
        destination: ride.destination,
        status: "CANCELLED",
      }),
    );

    return cancelledRide;
  });
};

/**
 * Validate admin-selected driver.
 */
const validateAssignableDriver = async (driverId, rideId) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new BadRequestError("Driver is not approved.");
  }

  if (driver.availability !== "AVAILABLE") {
    throw new ConflictError("Driver is not available.");
  }

  if (!driver.vehicle) {
    throw new BadRequestError("Vehicle registration required.");
  }

  const activeRide = await getActiveRideByDriverId(driverId);

  if (activeRide && activeRide.id !== rideId) {
    throw new ConflictError("Driver already has an active ride.");
  }

  return driver;
};

/**
 * Assign driver by admin.
 */
const assignDriver = async ({
  rideId,
  driverId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.status !== "REQUESTED") {
    throw new ConflictError("Only requested rides can be assigned.");
  }

  if (ride.driverId) {
    throw new ConflictError("Ride already has a driver. Use reassign instead.");
  }

  await validateAssignableDriver(driverId, rideId);

  return assignDriverWithAudit({
    rideId,
    driverId,
    adminId,
    ipAddress,
    userAgent,
  });
};

/**
 * Reassign driver by admin.
 */
const reassignDriver = async ({
  rideId,
  driverId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (!["ACCEPTED", "ARRIVED"].includes(ride.status)) {
    throw new ConflictError(
      "Only accepted or arrived rides can be reassigned.",
    );
  }

  if (!ride.driverId) {
    throw new ConflictError("Ride has no assigned driver. Use assign instead.");
  }

  if (ride.driverId === driverId) {
    throw new ConflictError(
      "Selected driver is already assigned to this ride.",
    );
  }

  await validateAssignableDriver(driverId, rideId);

  return reassignDriverWithAudit({
    rideId,
    oldDriverId: ride.driverId,
    newDriverId: driverId,
    adminId,
    ipAddress,
    userAgent,
  });
};

/**
 * Force complete ride by admin.
 */
const forceCompleteRide = async ({ rideId, adminId, ipAddress, userAgent }) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (!["ACCEPTED", "ARRIVED", "STARTED"].includes(ride.status)) {
    throw new ConflictError(
      `Ride in ${ride.status} status cannot be force completed.`,
    );
  }

  return forceCompleteRideWithAudit({
    rideId,
    driverId: ride.driverId,
    adminId,
    previousStatus: ride.status,
    ipAddress,
    userAgent,
  });
};

/**
 * Get ride timeline.
 */
const getRideTimeline = async (rideId) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      entity: "RIDE",
      entityId: rideId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return logs;
};

/**
 * Get ride logs.
 */
const getRideLogs = async (rideId) => {
  const ride = await findRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  return prisma.auditLog.findMany({
    where: {
      entity: "RIDE",
      entityId: rideId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

module.exports = {
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
};
