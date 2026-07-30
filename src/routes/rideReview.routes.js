const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");

const {
  createReview,
  getDriverReviews,
} = require("../controllers/rideReview.controller");

/**
 * User submits review for a completed ride
 */
router.post(
  "/:rideId",
  authenticate,
  createReview,
);

/**
 * Get all reviews of a driver
 */
router.get(
  "/driver/:driverId",
  getDriverReviews,
);

module.exports = router;