const prisma = require("../config/prisma");
const { ConflictError } = require("../utils/AppError");

/**
 * Create a new ride
 */
const createRide = async (data, db = prisma) => {
  return db.ride.create({
    data,
  });
};

/**
 * Get ride by ID
 */
const getRideById = async (rideId, db = prisma) => {
  return db.ride.findUnique({
    where: {
      id: rideId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      driver: {
        include: {
          vehicle: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Get ride by ID for its owner
 */
const getRideByIdForUser = async (rideId, userId) => {
  return prisma.ride.findFirst({
    where: {
      id: rideId,
      OR: [
        { userId },
        { driver: { userId } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      driver: {
        include: {
          vehicle: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Get all rides of a user (bounded)
 */
const getUserRides = async (userId, options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;
  const skip = options.page
    ? (Math.max(1, Number(options.page)) - 1) * take
    : (options.skip ? Number(options.skip) : 0);

  return prisma.ride.findMany({
    where: {
      userId,
    },
    take,
    skip,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      driver: {
        include: {
          vehicle: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Assign driver to ride
 */
const assignDriver = async (rideId, driverId, db = prisma) => {
  const result = await db.ride.updateMany({
    where: {
      id: rideId,
      driverId: null,
      status: "REQUESTED",
    },
    data: {
      driverId,
      status: "ACCEPTED",
    },
  });

  if (result.count === 0) {
    throw new ConflictError(
      "Ride is no longer available or has already been accepted.",
    );
  }

  return getRideById(rideId, db);
};

/**
 * Update ride status
 */
const updateRideStatus = async (rideId, status, db = prisma) => {
  await db.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status,
    },
  });

  return getRideById(rideId, db);
};

/**
 * Update Ride
 */
const updateRide = async (rideId, data, db = prisma) => {
  await db.ride.update({
    where: {
      id: rideId,
    },
    data,
  });

  return getRideById(rideId, db);
};

/**
 * Get Ride For Coupon
 */
const getRideForCoupon = async (rideId, db = prisma) => {
  return db.ride.findUnique({
    where: {
      id: rideId,
    },
    select: {
      id: true,
      userId: true,
      finalFare: true,
      status: true,
      couponId: true,
    },
  });
};

/**
 * Get active ride of a user
 */
const getActiveRideByUserId = async (userId, db = prisma) => {
  return db.ride.findFirst({
    where: {
      userId,
      isScheduled: false,
      status: {
        in: ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get active ride of a driver
 */
const getActiveRideByDriverId = async (driverId, db = prisma) => {
  return db.ride.findFirst({
    where: {
      driverId,
      status: {
        in: ["ACCEPTED", "ARRIVED", "STARTED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get available rides for drivers (bounded)
 */
const getAvailableRides = async (options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;

  return prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      driverId: null,
      isScheduled: false,
    },
    take,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          profileImage: true,
        },
      },
    },
  });
};

/**
 * Cancel Ride
 */
const cancelRide = async (rideId, db = prisma) => {
  await db.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: "CANCELLED",
    },
  });

  return getRideById(rideId, db);
};

/**
 * Get Current Active Ride Of Driver
 */
const getCurrentRideByDriver = async (driverId) => {
  return prisma.ride.findFirst({
    where: {
      driverId,
      status: {
        in: ["ACCEPTED", "ARRIVED", "STARTED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          profileImage: true,
        },
      },
      driver: {
        include: {
          vehicle: true,
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Save Ride Reject History
 */
const createRideReject = async (rideId, driverId) => {
  const rId = typeof rideId === "object" && rideId !== null ? rideId.rideId : rideId;
  const dId = typeof rideId === "object" && rideId !== null ? rideId.driverId : driverId;

  return prisma.rideReject.create({
    data: {
      rideId: rId,
      driverId: dId,
    },
  });
};

/**
 * Check if driver already rejected this ride
 */
const hasDriverRejectedRide = async (rideId, driverId) => {
  return prisma.rideReject.findUnique({
    where: {
      rideId_driverId: {
        rideId,
        driverId,
      },
    },
  });
};

/**
 * Get all rejected ride ids of a driver
 */
const getRejectedRideIdsByDriver = async (driverId) => {
  const rejected = await prisma.rideReject.findMany({
    where: {
      driverId,
    },
    select: {
      rideId: true,
    },
  });

  return rejected.map((item) => item.rideId);
};

/**
 * Find scheduled rides that are due for dispatch within lead time window (bounded).
 */
const findDueScheduledRides = async (leadTimeMinutes = 15, limit = 50) => {
  const targetTime = new Date(Date.now() + leadTimeMinutes * 60 * 1000);
  const boundedLimit = Math.min(Number(limit) || 50, 100);

  return prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      isScheduled: true,
      scheduledFor: {
        lte: targetTime,
      },
    },
    take: boundedLimit,
    orderBy: {
      scheduledFor: "asc",
    },
  });
};

/**
 * Atomically activate a scheduled ride so it becomes available to drivers.
 * Idempotent: only updates if isScheduled: true and status: 'REQUESTED'.
 */
const activateScheduledRide = async (rideId) => {
  return prisma.ride.updateMany({
    where: {
      id: rideId,
      status: "REQUESTED",
      isScheduled: true,
    },
    data: {
      isScheduled: false,
    },
  });
};

module.exports = {
  createRide,
  getRideById,
  getRideByIdForUser,
  getUserRides,
  assignDriver,
  updateRideStatus,
  updateRide,
  getRideForCoupon,
  getActiveRideByUserId,
  getActiveRideByDriverId,
  getAvailableRides,
  cancelRide,
  getCurrentRideByDriver,
  createRideReject,
  hasDriverRejectedRide,
  getRejectedRideIdsByDriver,
  findDueScheduledRides,
  activateScheduledRide,
};
