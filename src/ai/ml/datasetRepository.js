const prisma = require("../../config/prisma");

const EMPTY_RANGE = { from: null, to: null };

const getRange = (records, field = "createdAt") => {
  const dates = records
    .map((record) => new Date(record[field]))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);

  return dates.length
    ? { from: dates[0].toISOString(), to: dates[dates.length - 1].toISOString() }
    : EMPTY_RANGE;
};

const getRideDataset = async ({ fromDate, toDate } = {}) => prisma.ride.findMany({
  where: {
    ...(fromDate || toDate ? {
      createdAt: {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lt: new Date(toDate) } : {}),
      },
    } : {}),
  },
  select: {
    id: true,
    createdAt: true,
    status: true,
    distance: true,
    duration: true,
    vehicleType: true,
    isScheduled: true,
    scheduledFor: true,
    finalFare: true,
    estimatedFare: true,
    driverId: true,
    userId: true,
    pickupLatitude: true,
    pickupLongitude: true,
    destinationLatitude: true,
    destinationLongitude: true,
  },
  orderBy: { createdAt: "asc" },
});

const getPaymentDataset = async ({ fromDate, toDate } = {}) => prisma.payment.findMany({
  where: {
    status: "SUCCESS",
    ...(fromDate || toDate ? {
      createdAt: {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lt: new Date(toDate) } : {}),
      },
    } : {}),
  },
  select: {
    id: true,
    createdAt: true,
    paidAt: true,
    amount: true,
    status: true,
    rideId: true,
  },
  orderBy: { createdAt: "asc" },
});

const getRatingDataset = async ({ fromDate, toDate } = {}) => prisma.rideReview.findMany({
  where: {
    ...(fromDate || toDate ? {
      createdAt: {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lt: new Date(toDate) } : {}),
      },
    } : {}),
  },
  select: {
    id: true,
    createdAt: true,
    rating: true,
    ride: {
      select: {
        id: true,
        createdAt: true,
        distance: true,
        duration: true,
        vehicleType: true,
        isScheduled: true,
      },
    },
  },
  orderBy: { createdAt: "asc" },
});

const getDatasetSnapshot = async ({ fromDate, toDate } = {}) => {
  const [rides, payments, ratings] = await Promise.all([
    getRideDataset({ fromDate, toDate }),
    getPaymentDataset({ fromDate, toDate }),
    getRatingDataset({ fromDate, toDate }),
  ]);

  return {
    rides,
    payments,
    ratings,
    ranges: {
      rides: getRange(rides),
      payments: getRange(payments),
      ratings: getRange(ratings),
    },
  };
};

module.exports = {
  getRideDataset,
  getPaymentDataset,
  getRatingDataset,
  getDatasetSnapshot,
  getRange,
};
