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
 * Get Review By ID
 */
const getReviewById = async (id) => {
  return prisma.rideReview.findUnique({
    where: {
      id,
    },
  });
};

/**
 * Get Reviews By Driver ID (bounded)
 */
const getDriverReviews = async (driverId, options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;
  const skip = options.page
    ? (Math.max(1, Number(options.page)) - 1) * take
    : (options.skip ? Number(options.skip) : 0);

  return prisma.rideReview.findMany({
    where: {
      driverId,
    },
    take,
    skip,
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
const getDriverRatingStats = async (driverId, db = prisma) => {
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

/**
 * Delete Review
 */
const deleteReview = async (id, db = prisma) => {
  return db.rideReview.delete({
    where: {
      id,
    },
  });
};

module.exports = {
  createReview,
  getReviewByRideId,
  getReviewById,
  getDriverReviews,
  getDriverRatingStats,
  updateDriverRating,
  deleteReview,
};
