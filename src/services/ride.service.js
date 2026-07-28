const rideRepository = require("../repositories/ride.repository");

const {
  getDriverById,
  updateDriverAvailability,
} = require("../repositories/driver.repository");

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
    throw new Error(
      `Invalid ride status transition: ${currentStatus} → ${newStatus}`
    );
  }
};

/**
 * Create Ride
 */
const createRide = async (rideData) => {
  const { userId, pickup, destination, vehicleType } = rideData;

  const activeRide = await rideRepository.getActiveRideByUserId(userId);

  if (activeRide) {
    throw new Error(
      "You already have an active ride. Complete or cancel it before booking a new one."
    );
  }

  if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
    throw new Error("Pickup and destination cannot be the same.");
  }

  return await rideRepository.createRide({
    userId,
    pickup: pickup.trim(),
    destination: destination.trim(),
    distance: 0,
    fare: 0,
    vehicleType,
  });
};

/**
 * Get Ride By ID
 */
const getRideById = async (rideId) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new Error("Ride not found.");
  }

  return ride;
};

/**
 * Get User Ride History
 */
const getUserRides = async (userId) => {
  return await rideRepository.getUserRides(userId);
};

/**
 * Get Available Rides For Driver
 */
const getAvailableRides = async (driverId) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new Error("Driver not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new Error("Driver is not approved yet.");
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
    throw new Error("Driver can only be assigned to requested rides.");
  }

  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new Error("Driver not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new Error("Driver is not approved yet.");
  }

  if (driver.availability !== "AVAILABLE") {
    throw new Error("Driver is not available.");
  }

  if (!driver.vehicle) {
    throw new Error("Please register your vehicle before accepting rides.");
  }

  const activeRide = await rideRepository.getActiveRideByDriverId(driverId);

  if (activeRide) {
    throw new Error("Driver already has an active ride.");
  }

  const updatedRide = await rideRepository.assignDriver(rideId, driverId);

  await updateDriverAvailability(driver.id, "BUSY");

  return updatedRide;
};

/**
 * Update Ride Status
 */
const updateRideStatus = async (rideId, driverId, status) => {
  const ride = await getRideById(rideId);

  if (!ride.driverId) {
    throw new Error("No driver assigned to this ride.");
  }

  if (ride.driverId !== driverId) {
    throw new Error("You are not authorized to update this ride.");
  }

  validateStatusTransition(ride.status, status);

  const updatedRide = await rideRepository.updateRideStatus(rideId, status);

  if (status === "COMPLETED") {
    await updateDriverAvailability(driverId, "AVAILABLE");
  }

  return updatedRide;
};

/**
 * Reject Ride
 */
const rejectRide = async (rideId, driverId) => {
  const ride = await getRideById(rideId);

  if (ride.status !== "REQUESTED") {
    throw new Error("Only requested rides can be rejected.");
  }

  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new Error("Driver not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new Error("Driver is not approved yet.");
  }

  if (driver.availability !== "AVAILABLE") {
    throw new Error("Driver is not available.");
  }

  const alreadyRejected =
    await rideRepository.hasDriverRejectedRide(rideId, driverId);

  if (alreadyRejected) {
    throw new Error("You have already rejected this ride.");
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
    throw new Error("You are not allowed to cancel this ride.");
  }

  if (!["REQUESTED", "ACCEPTED"].includes(ride.status)) {
    throw new Error("This ride cannot be cancelled.");
  }

  return await rideRepository.cancelRide(rideId);
};

/**
 * Get Driver Current Ride
 */
const getDriverCurrentRide = async (driverId) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new Error("Driver not found.");
  }

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