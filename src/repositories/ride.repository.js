const prisma = require("../config/prisma");

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
const getRideById = async (rideId) => {
  return prisma.ride.findUnique({
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
 * Get all rides of a user
 */
const getUserRides = async (userId) => {
  return prisma.ride.findMany({
    where: {
      userId,
    },
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
  return db.ride.update({
    where: {
      id: rideId,
    },
    data: {
      driverId,
      status: "ACCEPTED",
    },
  });
};

/**
 * Update ride status
 */
const updateRideStatus = async (rideId, status, db = prisma) => {
  return db.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status,
    },
  });
};

/**
 * Get active ride of a user
 */
const getActiveRideByUserId = async (userId) => {
  return prisma.ride.findFirst({
    where: {
      userId,
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
const getActiveRideByDriverId = async (driverId) => {
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
  });
};

/**
 * Get available rides for drivers
 */
const getAvailableRides = async () => {
  return prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      driverId: null,
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
    },
  });
};

/**
 * Cancel Ride
 */
const cancelRide = async (rideId, db = prisma) => {
  return db.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: "CANCELLED",
    },
  });
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
  return prisma.rideReject.create({
    data: {
      rideId,
      driverId,
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

module.exports = {
  createRide,
  getRideById,
  getUserRides,
  assignDriver,
  updateRideStatus,
  getActiveRideByUserId,
  getActiveRideByDriverId,
  getAvailableRides,
  cancelRide,
  getCurrentRideByDriver,
  createRideReject,
  hasDriverRejectedRide,
  getRejectedRideIdsByDriver,
};
