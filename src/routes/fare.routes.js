const express = require("express");

const router = express.Router();

const { calculateRideFare } = require("../controllers/fare.controller");

const { validate } = require("../middleware/validate.middleware");
const { fareEstimateLimiter } = require("../middleware/rateLimit.middleware");

const { calculateFareSchema } = require("../validators/fare.validator");

/**
 * @swagger
 * /api/fare/calculate:
 *   post:
 *     tags:
 *       - Fare
 *     operationId: calculateFare
 *     summary: Estimate a route fare using server-derived route details
 *     description: >
 *       Calculates fare for a customer route by resolving pickup and destination
 *       coordinates on the server using the existing maps routing service. Client
 *       input cannot control authoritative distance, duration, toll, airport, or
 *       discount values.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleType
 *               - pickupLatitude
 *               - pickupLongitude
 *               - destinationLatitude
 *               - destinationLongitude
 *             properties:
 *               city:
 *                 type: string
 *                 example: DEFAULT
 *               vehicleType:
 *                 type: string
 *                 enum:
 *                   - BIKE
 *                   - AUTO
 *                   - CAR
 *                   - SUV
 *                 example: CAR
 *               pickupLatitude:
 *                 type: number
 *                 example: 26.8467
 *               pickupLongitude:
 *                 type: number
 *                 example: 80.9462
 *               destinationLatitude:
 *                 type: number
 *                 example: 26.9124
 *               destinationLongitude:
 *                 type: number
 *                 example: 80.9463
 *     responses:
 *       200:
 *         description: Fare estimated successfully.
 *       400:
 *         description: Validation failed or route inputs are invalid.
 *       404:
 *         description: Pricing configuration not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/calculate",
  fareEstimateLimiter,
  validate(calculateFareSchema),
  calculateRideFare,
);

module.exports = router;
