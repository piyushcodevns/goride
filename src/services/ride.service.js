const rideRepository = require("../repositories/ride.repository");
const prisma = require("../config/prisma");
const logger = require("../utils/logger");
const { createFareAudit } = require("../repositories/fareAudit.repository");

const {
  getDriverById,
  updateDriverAvailability,
} = require("../repositories/driver.repository");

const { getRouteDetails } = require("./openRoute.service");

const { calculateFare } = require("./fare.service");

const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");

const {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
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
    city = "DEFAULT",
    isScheduled = false,
    scheduledFor = null,
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
    pickupLatitude == null ||
    pickupLongitude == null ||
    destinationLatitude == null ||
    destinationLongitude == null ||
    Number.isNaN(pickupLatitude) ||
    Number.isNaN(pickupLongitude) ||
    Number.isNaN(destinationLatitude) ||
    Number.isNaN(destinationLongitude)
  ) {
    throw new BadRequestError(
      "Valid pickup and destination coordinates are required.",
    );
  }

  /**
   * Scheduled Ride Validation
   */
  if (isScheduled) {
    if (!scheduledFor) {
      throw new BadRequestError("Scheduled date and time are required.");
    }

    const scheduledDate = new Date(scheduledFor);

    if (Number.isNaN(scheduledDate.getTime())) {
      throw new BadRequestError("Invalid scheduled date and time.");
    }

    const now = new Date();

    if (scheduledDate <= now) {
      throw new BadRequestError("Scheduled ride must be in the future.");
    }

    const minimumScheduleTime = new Date(now.getTime() + 15 * 60 * 1000);

    if (scheduledDate < minimumScheduleTime) {
      throw new BadRequestError(
        "Scheduled ride must be at least 15 minutes in advance.",
      );
    }
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
   * Calculate Enterprise Fare
   */
  const fareDetails = await calculateFare({
    city,

    vehicleType,

    distanceKm: routeDetails.distance,

    durationMinutes: routeDetails.duration,
  });

  /**
   * ETA
   */
  const rideStartTime = isScheduled ? new Date(scheduledFor) : new Date();

  const estimatedArrival = new Date(
    rideStartTime.getTime() + routeDetails.duration * 60 * 1000,
  );

  const createdRide = await prisma.$transaction(async (tx) => {
    const ride = await rideRepository.createRide(
      {
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

        estimatedFare: fareDetails.estimatedFare,

        baseFare: fareDetails.baseFare,
        distanceFare: fareDetails.distanceFare,
        durationFare: fareDetails.durationFare,

        platformFee: fareDetails.platformFee,
        bookingFee: fareDetails.bookingFee,

        gstAmount: fareDetails.gstAmount,

        waitingCharge: fareDetails.waitingCharge,
        airportCharge: fareDetails.airportCharge,
        tollCharge: fareDetails.tollCharge,

        surgeMultiplier: fareDetails.surgeMultiplier,
        surgeAmount: fareDetails.surgeAmount,

        fareBreakdown: fareDetails.fareBreakdown,

        discountAmount: fareDetails.discountAmount,

        finalFare: fareDetails.finalFare,

        isScheduled,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,

        vehicleType,
      },
      tx,
    );

    await createFareAudit(
      {
        rideId: ride.id,
        pricingConfigId: fareDetails.pricingConfigId,

        baseFare: fareDetails.baseFare,
        distanceFare: fareDetails.distanceFare,
        durationFare: fareDetails.durationFare,

        surgeAmount: fareDetails.surgeAmount,
        discountAmount: fareDetails.discountAmount,
        platformFee: fareDetails.platformFee,

        finalFare: fareDetails.finalFare,

        breakdown: {
          ...fareDetails.fareBreakdown,

          pricingRules: fareDetails.pricingRules,

          inputSnapshot: {
            city,
            vehicleType,

            distanceKm: routeDetails.distance,
            durationMinutes: routeDetails.duration,

            waitingMinutes: 0,
            tollCharge: 0,

            isAirportRide: fareDetails.pricingRules?.isAirportRide ?? false,
            isPeakHour: fareDetails.pricingRules?.isPeakHour ?? false,
            isNightRide: fareDetails.pricingRules?.isNightRide ?? false,
            isRaining: fareDetails.pricingRules?.isRaining ?? false,
            isEventRide: fareDetails.pricingRules?.isEventRide ?? false,
          },

          discountSnapshot: {
            requestedDiscount: 0,
            appliedDiscount: fareDetails.discountAmount,
          },

          pricingSnapshot: {
            pricingConfigId: fareDetails.pricingConfigId,

            baseFare: fareDetails.baseFare,
            pricePerKm: fareDetails.fareBreakdown?.pricePerKm ?? null,
            pricePerMinute: fareDetails.fareBreakdown?.pricePerMinute ?? null,

            gstPercentage: fareDetails.fareBreakdown.gstPercentage,
            minimumFare: fareDetails.fareBreakdown.minimumFare,
          },
        },
      },
      tx,
    );

    await notificationService.dispatchNotification(
      NotificationFactory.createRideBookedNotification({
        userId,
        rideId: ride.id,
        pickup,
        destination,
        status: ride.status,
      }),
    );

    return {
      ...ride,

      baseFare: Number(ride.baseFare),
      distanceFare: Number(ride.distanceFare),
      durationFare: Number(ride.durationFare),

      bookingFee: Number(ride.bookingFee),
      platformFee: Number(ride.platformFee),

      surgeAmount: Number(ride.surgeAmount),
      surgeMultiplier: Number(ride.surgeMultiplier),

      airportCharge: Number(ride.airportCharge),
      tollCharge: Number(ride.tollCharge),
      waitingCharge: Number(ride.waitingCharge),

      gstAmount: Number(ride.gstAmount),

      discountAmount: Number(ride.discountAmount),

      estimatedFare: Number(ride.estimatedFare),
      finalFare: Number(ride.finalFare),
    };
  });

  if (isScheduled && scheduledFor) {
    try {
      const { addScheduledRideActivationJob } = require("../queues/scheduledRide.queue");
      await addScheduledRideActivationJob({
        rideId: createdRide.id,
        scheduledFor,
      });
    } catch (queueErr) {
      logger.warn("Scheduled ride activation job skipped or failed.", {
        rideId: createdRide.id,
        error: queueErr.message,
      });
    }
  }

  return createdRide;
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
 * Get Ride By ID For User
 */
const getRideByIdForUser = async (rideId, userId) => {
  const ride = await rideRepository.getRideByIdForUser(rideId, userId);

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
  return prisma.$transaction(async (tx) => {
    const ride = await rideRepository.getRideById(rideId, tx);

    if (!ride) {
      throw new NotFoundError("Ride not found.");
    }

    if (ride.status !== "REQUESTED") {
      throw new ConflictError("Ride is not available.");
    }

    const driver = await getDriverById(driverId, tx);

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

    const activeRide = await rideRepository.getActiveRideByDriverId(
      driverId,
      tx,
    );

    if (activeRide) {
      throw new ConflictError("Driver already has an active ride.");
    }

    const updatedRide = await rideRepository.assignDriver(rideId, driverId, tx);

    await updateDriverAvailability(driverId, "BUSY", tx);

    await notificationService.dispatchNotification(
      NotificationFactory.createRideAcceptedNotification({
        userId: ride.userId,
        rideId: ride.id,
        driverId,
        status: "ACCEPTED",
      }),
    );
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

    /**
     * Ride Status Notifications
     */

    if (status === "ARRIVED") {
      await notificationService.dispatchNotification(
        NotificationFactory.createDriverArrivedNotification({
          userId: ride.userId,
          rideId: ride.id,
          driverId,
          status: "ARRIVED",
        }),
      );
    }

    if (status === "STARTED") {
      await notificationService.dispatchNotification(
        NotificationFactory.createRideStartedNotification({
          userId: ride.userId,
          rideId: ride.id,
          driverId,
          status: "STARTED",
        }),
      );
    }

    if (status === "COMPLETED") {
      await updateDriverAvailability(driverId, "AVAILABLE", tx);

      await notificationService.dispatchNotification(
        NotificationFactory.createRideCompletedNotification({
          userId: ride.userId,
          rideId: ride.id,
          driverId,
          status: "COMPLETED",
        }),
      );

      try {
        const { addRideDatasetJob } = require("../queues/dataset.queue");
        await addRideDatasetJob({
          rideId: ride.id,
          eventType: "RIDE_COMPLETED",
        });
      } catch (datasetErr) {
        logger.warn("Ride dataset extraction job skipped or failed.", {
          rideId: ride.id,
          error: datasetErr.message,
        });
      }
    }

    return updatedRide;
  });
};

/**
 * Reject Ride
 */
const rejectRide = async (rideId, driverId) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.status !== "REQUESTED") {
    throw new ConflictError("Only requested rides can be rejected.");
  }

  // Only approved drivers can reject rides.
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new ForbiddenError("Only approved drivers can reject rides.");
  }

  // Prevent duplicate rejection records.
  const alreadyRejected = await rideRepository.hasDriverRejectedRide(
    rideId,
    driverId,
  );

  if (alreadyRejected) {
    throw new ConflictError("You have already rejected this ride.");
  }

  await rideRepository.createRideReject({
    rideId,
    driverId,
  });

  await notificationService.sendRideNotification(ride.userId, "RIDE_REJECTED", {
    rideId: ride.id,
  });

  return {
    message: "Ride rejected successfully.",
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
 * Driver Current Ride
 */
const getDriverCurrentRide = async (driverId) => {
  return await rideRepository.getCurrentRideByDriver(driverId);
};

/**
 * Activate a scheduled ride (called by worker/processor).
 * Idempotent: checks return count; returns early if already activated.
 */
const activateScheduledRide = async (rideId) => {
  if (!rideId) {
    throw new BadRequestError("rideId is required to activate scheduled ride.");
  }

  const updateResult = await rideRepository.activateScheduledRide(rideId);

  if (updateResult.count > 0) {
    const ride = await rideRepository.getRideById(rideId);
    if (ride) {
      await notificationService.dispatchNotification({
        userId: ride.userId,
        title: "Scheduled Ride Activated",
        message: `Your scheduled ride from ${ride.pickup} is now active and searching for drivers.`,
        type: "RIDE",
        channel: "IN_APP",
        metadata: { rideId: ride.id, action: "SCHEDULED_RIDE_ACTIVATED" },
      });
    }

    logger.info("Scheduled ride activated successfully.", { rideId });
    return { activated: true, rideId };
  }

  logger.info("Scheduled ride activation skipped (already active, assigned, or cancelled).", { rideId });
  return { activated: false, reason: "Already active or not found", rideId };
};

/**
 * Process all due scheduled rides (called by periodic sweep scheduler).
 */
const processDueScheduledRides = async (leadTimeMinutes = 15) => {
  const dueRides = await rideRepository.findDueScheduledRides(leadTimeMinutes);
  let activatedCount = 0;

  for (const ride of dueRides) {
    const result = await activateScheduledRide(ride.id);
    if (result.activated) {
      activatedCount += 1;
    }
  }

  logger.info("Processed due scheduled rides.", {
    totalDue: dueRides.length,
    activatedCount,
  });

  return {
    totalChecked: dueRides.length,
    activatedCount,
  };
};

module.exports = {
  createRide,
  getRideById,
  getRideByIdForUser,
  getUserRides,
  getAvailableRides,
  assignDriver,
  updateRideStatus,
  rejectRide,
  cancelRide,
  getDriverCurrentRide,
  activateScheduledRide,
  processDueScheduledRides,
};
