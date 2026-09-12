const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");

const {
  createReview,
  getDriverReviews,
} = require("../controllers/rideReview.controller");

/**
 * @swagger
 * tags:
 *   name: Ride Reviews
 *   description: Ride review and driver rating APIs
 */

/**
 * @swagger
 * /api/ride-reviews/{rideId}:
 *   post:
 *     summary: Submit a review for a completed ride
 *     tags: [Ride Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               review:
 *                 type: string
 *                 example: Very polite driver and smooth ride.
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ride not found
 *       409:
 *         description: Review already exists
 */
router.post("/:rideId", authenticate, createReview);

/**
 * @swagger
 * /api/ride-reviews/driver/{driverId}:
 *   get:
 *     summary: Get all reviews of a driver
 *     tags: [Ride Reviews]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver reviews fetched successfully
 *       404:
 *         description: Driver not found
 */
router.get("/driver/:driverId", getDriverReviews);

module.exports = router;
