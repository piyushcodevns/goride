const prisma = require("../config/prisma");

/**
 * Create Ride Review
 */
const createReview = async (data, db = prisma) => {
  return db.rideReview.create({
    data,
  });
};

/**
 * Get Review By Ride ID
 */
const getReviewByRideId = async (rideId) => {
  return prisma.rideReview.findUnique({
    where: {
      rideId,
    },
  });
};

/**
 * Get Reviews By Driver ID
 */
const getDriverReviews = async (driverId) => {
  return prisma.rideReview.findMany({
    where: {
      driverId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      ride: {
        select: {
          id: true,
          pickup: true,
          destination: true,
          createdAt: true,
        },
      },
    },
  });
};

/**
 * Calculate Driver Rating
 */
const getDriverRatingStats = async (
  driverId,
  db = prisma,
) => {
  const stats = await db.rideReview.aggregate({
    where: {
      driverId,
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  return {
    averageRating: stats._avg.rating || 0,
    totalRatings: stats._count.rating || 0,
  };
};

/**
 * Update Driver Rating
 */
const updateDriverRating = async (
  driverId,
  averageRating,
  totalRatings,
  db = prisma,
) => {
  return db.driver.update({
    where: {
      id: driverId,
    },
    data: {
      averageRating,
      totalRatings,
    },
  });
};

module.exports = {
  createReview,
  getReviewByRideId,
  getDriverReviews,
  getDriverRatingStats,
  updateDriverRating,
};