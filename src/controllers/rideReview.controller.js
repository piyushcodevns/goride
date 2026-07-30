const rideReviewService = require("../services/rideReview.service");

const validate = require("../utils/validate");

const {
  createRideReviewSchema,
} = require("../validators/rideReview.validator");

/**
 * Create Ride Review
 */
const createReview = async (req, res, next) => {
  try {
    const data = validate(createRideReviewSchema, req.body);

    const review = await rideReviewService.createReview({
      rideId: req.params.rideId,
      userId: req.user.id,
      rating: data.rating,
      review: data.review,
    });

    return res.status(201).json({
      success: true,
      message: "Ride review submitted successfully.",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Driver Reviews
 */
const getDriverReviews = async (req, res, next) => {
  try {
    const reviews = await rideReviewService.getDriverReviews(
      req.params.driverId,
    );

    return res.status(200).json({
      success: true,
      message: "Driver reviews fetched successfully.",
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getDriverReviews,
};