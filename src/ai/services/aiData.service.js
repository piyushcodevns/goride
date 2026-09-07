const prisma = require("../../config/prisma");

const getRideHistory = async ({ fromDate, toDate }) => {
  return prisma.ride.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      userId: true,
      driverId: true,
      status: true,
      vehicleType: true,
      distance: true,
      duration: true,
      estimatedFare: true,
      finalFare: true,
      pickupLatitude: true,
      pickupLongitude: true,
      destinationLatitude: true,
      destinationLongitude: true,
      couponId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getDriverHistory = async ({ fromDate, toDate }) => {
  return prisma.driver.findMany({
    where: {
      createdAt: {
        lte: new Date(toDate),
      },
    },
    select: {
      id: true,
      status: true,
      availability: true,
      experience: true,
      averageRating: true,
      totalRatings: true,
      createdAt: true,
      rides: {
        where: {
          createdAt: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        },
        select: {
          id: true,
          status: true,
          vehicleType: true,
          createdAt: true,
        },
      },
      rideRejects: {
        where: {
          createdAt: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        },
        select: {
          id: true,
          rideId: true,
          createdAt: true,
        },
      },
    },
  });
};

const getPaymentHistory = async ({ fromDate, toDate }) => {
  return prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      rideId: true,
      userId: true,
      amount: true,
      paymentMethod: true,
      status: true,
      gateway: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getCouponUsageHistory = async ({ fromDate, toDate }) => {
  return prisma.couponUsage.findMany({
    where: {
      usedAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      couponId: true,
      rideId: true,
      userId: true,
      discountAmount: true,
      usedAt: true,
    },
    orderBy: {
      usedAt: "asc",
    },
  });
};

const getUserHistory = async ({ fromDate, toDate }) => {
  return prisma.user.findMany({
    where: {
      role: "USER",
      createdAt: {
        lte: new Date(toDate),
      },
    },
    select: {
      id: true,
      createdAt: true,
      isActive: true,
      isVerified: true,
      rides: {
        where: {
          createdAt: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
};

module.exports = {
  getRideHistory,
  getDriverHistory,
  getPaymentHistory,
  getCouponUsageHistory,
  getUserHistory,
};

const getFareHistory = async ({ fromDate, toDate }) => {
  return prisma.ride.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      vehicleType: true,
      distance: true,
      duration: true,
      estimatedFare: true,
      finalFare: true,
      baseFare: true,
      bookingFee: true,
      distanceFare: true,
      durationFare: true,
      platformFee: true,
      gstAmount: true,
      surgeAmount: true,
      surgeMultiplier: true,
      discountAmount: true,
      tollCharge: true,
      waitingCharge: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getFareHistory = getFareHistory;

const getVehicleRecommendationHistory = async ({ fromDate, toDate }) => {
  return prisma.ride.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      vehicleType: true,
      distance: true,
      finalFare: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getVehicleRecommendationHistory =
  getVehicleRecommendationHistory;

const getRatingHistory = async ({
  fromDate,
  toDate,
}) => {
  return prisma.rideReview.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
      rating: {
        gte: 1,
        lte: 5,
      },
    },
    select: {
      id: true,
      rating: true,
      createdAt: true,
      ride: {
        select: {
          id: true,
          vehicleType: true,
          distance: true,
          duration: true,
          isScheduled: true,
          scheduledFor: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getRatingHistory =
  getRatingHistory;

const getCancellationHistory = async ({
  fromDate,
  toDate,
}) => {
  return prisma.ride.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
    },
    select: {
      id: true,
      vehicleType: true,
      distance: true,
      estimatedFare: true,
      isScheduled: true,
      scheduledFor: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getCancellationHistory =
  getCancellationHistory;

const getChurnHistory = async ({
  fromDate,
  toDate,
}) => {
  return prisma.user.findMany({
    where: {
      createdAt: {
        lt: new Date(toDate),
      },
      rides: {
        some: {
          createdAt: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      rides: {
        where: {
          createdAt: {
            gte: new Date(fromDate),
            lt: new Date(toDate),
          },
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          vehicleType: true,
          distance: true,
          finalFare: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
};

module.exports.getChurnHistory =
  getChurnHistory;

const getRevenueHistory = async ({
  fromDate,
  toDate,
}) => {
  return prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
      status: "SUCCESS",
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      paidAt: true,
      ride: {
        select: {
          id: true,
          status: true,
          vehicleType: true,
          distance: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getRevenueHistory =
  getRevenueHistory;
