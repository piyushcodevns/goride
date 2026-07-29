const rideRepository = require("../repositories/ride.repository");
const prisma = require("../config/prisma");

const {
  getDriverById,
  updateDriverAvailability,
} = require("../repositories/driver.repository");

const { getRouteDetails } = require("./openRoute.service");

const { calculateFare } = require("../config/fare.config");

const {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} = require("../utils/AppError");

/**
 * Allowed Ride Status Flow
 */
const RIDE_STATUS_FLOW = {
  REQUESTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Validate Status Transition
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedStatuses = RIDE_STATUS_FLOW[currentStatus];

  if (!allowedStatuses.includes(newStatus)) {
    throw new BadRequestError(
      `Invalid ride status transition: ${currentStatus} → ${newStatus}`,
    );
  }
};

/**
 * Create Ride
 */
const createRide = async (rideData) => {
  const {
    userId,
    pickup,
    destination,
    pickupLatitude,
    pickupLongitude,
    destinationLatitude,
    destinationLongitude,
    vehicleType,
  } = rideData;

  if (!pickup || !destination || !vehicleType) {
    throw new BadRequestError(
      "Pickup, destination and vehicle type are required.",
    );
  }

  if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
    throw new BadRequestError("Pickup and destination cannot be same.");
  }

  const activeRide = await rideRepository.getActiveRideByUserId(userId);

  if (activeRide) {
    throw new ConflictError("You already have an active ride.");
  }

  if (
    !pickupLatitude ||
    !pickupLongitude ||
    !destinationLatitude ||
    !destinationLongitude
  ) {
    throw new BadRequestError(
      "Pickup and destination coordinates are required.",
    );
  }

  /**
   * Get Route Details
   */
  const routeDetails = await getRouteDetails(
    {
      latitude: pickupLatitude,
      longitude: pickupLongitude,
    },
    {
      latitude: destinationLatitude,
      longitude: destinationLongitude,
    },
  );

  /**
   * Calculate Fare
   */
  const fare = calculateFare(vehicleType, routeDetails.distance);

  /**
   * ETA
   */
  const estimatedArrival = new Date(
    Date.now() + routeDetails.duration * 60 * 1000,
  );

  return await rideRepository.createRide({
    userId,

    pickup: pickup.trim(),

    pickupLatitude,

    pickupLongitude,

    destination: destination.trim(),

    destinationLatitude,

    destinationLongitude,

    distance: routeDetails.distance,

    duration: routeDetails.duration,

    estimatedArrival,

    routeGeometry: routeDetails.geometry,

    fare,

    vehicleType,
  });
};

/**
 * Get Ride By ID
 */
const getRideById = async (rideId) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  return ride;
};

/**
 * User Ride History
 */
const getUserRides = async (userId) => {
  return await rideRepository.getUserRides(userId);
};

/**
 * Available Rides
 */
const getAvailableRides = async (driverId) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new BadRequestError("Driver is not approved.");
  }

  const rejectedRideIds =
    await rideRepository.getRejectedRideIdsByDriver(driverId);

  const rides = await rideRepository.getAvailableRides();

  return rides.filter((ride) => !rejectedRideIds.includes(ride.id));
};

/**
 * Assign Driver
 */
const assignDriver = async (rideId, driverId) => {
  const ride = await getRideById(rideId);

  if (ride.status !== "REQUESTED") {
    throw new ConflictError("Ride is not available.");
  }

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

  const activeRide = await rideRepository.getActiveRideByDriverId(driverId);

  if (activeRide) {
    throw new ConflictError("Driver already has active ride.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedRide = await rideRepository.assignDriver(rideId, driverId, tx);

    await updateDriverAvailability(driverId, "BUSY", tx);

    return updatedRide;
  });
};

/**
 * Update Ride Status
 */
const updateRideStatus = async (rideId, driverId, status) => {
  const ride = await getRideById(rideId);

  if (ride.driverId !== driverId) {
    throw new UnauthorizedError("Unauthorized.");
  }

  validateStatusTransition(ride.status, status);

  return prisma.$transaction(async (tx) => {
    const updatedRide = await rideRepository.updateRideStatus(
      rideId,
      status,
      tx,
    );

    if (status === "COMPLETED") {
      await updateDriverAvailability(driverId, "AVAILABLE", tx);
    }

    return updatedRide;
  });
};

/**
 * Reject Ride
 */
const rejectRide = async (rideId, driverId) => {
  const ride = await getRideById(rideId);

  if (ride.status !== "REQUESTED") {
    throw new ConflictError("Only requested rides can be rejected.");
  }

  await rideRepository.createRideReject(rideId, driverId);

  return {
    message: "Ride rejected successfully.",
    rideId,
  };
};

/**
 * Cancel Ride
 */
const cancelRide = async (rideId, userId) => {
  const ride = await getRideById(rideId);

  if (ride.userId !== userId) {
    throw new UnauthorizedError("Unauthorized.");
  }

  if (!["REQUESTED", "ACCEPTED"].includes(ride.status)) {
    throw new ConflictError("Ride cannot be cancelled.");
  }

  return prisma.$transaction(async (tx) => {
    const cancelledRide = await rideRepository.cancelRide(rideId, tx);

    if (ride.driverId) {
      await updateDriverAvailability(ride.driverId, "AVAILABLE", tx);
    }

    return cancelledRide;
  });
};

/**
 * Driver Current Ride
 */
const getDriverCurrentRide = async (driverId) => {
  return await rideRepository.getCurrentRideByDriver(driverId);
};

module.exports = {
  createRide,
  getRideById,
  getUserRides,
  getAvailableRides,
  assignDriver,
  updateRideStatus,
  rejectRide,
  cancelRide,
  getDriverCurrentRide,
};
