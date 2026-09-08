const prisma = require("../config/prisma");
const logger = require("../utils/logger");

/**
 * Process ride dataset extraction job.
 * Loads authoritative data from database using rideId.
 * Never logs or exposes credentials.
 */
const processDatasetJob = async (job) => {
  const { rideId, eventType = "RIDE_COMPLETED" } = job.data || {};

  if (!rideId) {
    throw new Error("rideId is required for dataset extraction.");
  }

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      status: true,
      distance: true,
      duration: true,
      vehicleType: true,
      isScheduled: true,
      scheduledFor: true,
      finalFare: true,
      estimatedFare: true,
      pickupLatitude: true,
      pickupLongitude: true,
      destinationLatitude: true,
      destinationLongitude: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!ride) {
    logger.warn("Ride record not found for dataset extraction.", { rideId });
    return { success: false, reason: "Ride not found", rideId };
  }

  // Extract structured feature record for downstream AI/ML consumption
  const featureRecord = {
    rideId: ride.id,
    eventType,
    distanceKm: Number(ride.distance || 0),
    durationMinutes: Number(ride.duration || 0),
    finalFare: ride.finalFare ? Number(ride.finalFare) : null,
    estimatedFare: ride.estimatedFare ? Number(ride.estimatedFare) : null,
    vehicleType: ride.vehicleType,
    isScheduled: ride.isScheduled,
    status: ride.status,
    hasCoordinates: Boolean(
      ride.pickupLatitude &&
      ride.pickupLongitude &&
      ride.destinationLatitude &&
      ride.destinationLongitude
    ),
    timestamp: new Date().toISOString(),
  };

  logger.info("Ride dataset feature record extracted.", {
    rideId: ride.id,
    eventType,
    featureSummary: {
      distanceKm: featureRecord.distanceKm,
      vehicleType: featureRecord.vehicleType,
      isScheduled: featureRecord.isScheduled,
    },
  });

  return {
    success: true,
    rideId: ride.id,
    extractedAt: featureRecord.timestamp,
  };
};

module.exports = {
  processDatasetJob,
};
