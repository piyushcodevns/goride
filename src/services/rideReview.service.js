const prisma = require("../config/prisma");

const rideRepository = require("../repositories/ride.repository");
const rideReviewRepository = require("../repositories/rideReview.repository");

const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../utils/AppError");

/**
 * Create Ride Review
 */
const createReview = async ({ rideId, userId, rating, review }) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new ForbiddenError("You can review only your own rides.");
  }

  if (ride.status !== "COMPLETED") {
    throw new BadRequestError("Only completed rides can be reviewed.");
  }

  if (!ride.driverId) {
    throw new BadRequestError("Driver not assigned to this ride.");
  }

  const existingReview = await rideReviewRepository.getReviewByRideId(rideId);

  if (existingReview) {
    throw new ConflictError("Review already submitted for this ride.");
  }

  if (rating < 1 || rating > 5) {
    throw new BadRequestError("Rating must be between 1 and 5.");
  }

  return prisma.$transaction(async (tx) => {
    const createdReview = await rideReviewRepository.createReview(
      {
        rideId,
        userId,
        driverId: ride.driverId,
        rating,
        review: review?.trim() || null,
      },
      tx,
    );

    const stats = await rideReviewRepository.getDriverRatingStats(
      ride.driverId,
      tx,
    );

    await rideReviewRepository.updateDriverRating(
      ride.driverId,
      Number(stats.averageRating.toFixed(2)),
      stats.totalRatings,
      tx,
    );

    return createdReview;
  });
};

/**
 * Get Driver Reviews
 */
const getDriverReviews = async (driverId) => {
  return rideReviewRepository.getDriverReviews(driverId);
};

module.exports = {
  createReview,
  getDriverReviews,
};
