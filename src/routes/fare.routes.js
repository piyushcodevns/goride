const express = require("express");

const router = express.Router();

const { calculateRideFare } = require("../controllers/fare.controller");

const { validate } = require("../middleware/validate.middleware");

const { calculateFareSchema } = require("../validators/fare.validator");

/**
 * @swagger
 * /api/v1/fare/calculate:
 *   post:
 *     tags:
 *       - Fare
 *     operationId: calculateFare
 *     summary: Calculate enterprise ride fare
 *     description: >
 *       Calculates ride fare using the enterprise pricing engine.
 *       The calculation includes base fare, distance fare, duration fare,
 *       waiting charges, toll charges, airport charges, surge pricing,
 *       GST, discounts and minimum fare protection.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleType
 *               - distanceKm
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
 *               distanceKm:
 *                 type: number
 *                 example: 12.5
 *               durationMinutes:
 *                 type: number
 *                 example: 25
 *               waitingMinutes:
 *                 type: number
 *                 example: 3
 *               tollCharge:
 *                 type: number
 *                 example: 50
 *               discountAmount:
 *                 type: number
 *                 example: 100
 *               isAirportRide:
 *                 type: boolean
 *                 example: false
 *               isPeakHour:
 *                 type: boolean
 *                 example: true
 *               isNightRide:
 *                 type: boolean
 *                 example: false
 *               isRaining:
 *                 type: boolean
 *                 example: false
 *               isEventRide:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Fare calculated successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Fare calculated successfully
 *               data:
 *                 city: DEFAULT
 *                 vehicleType: CAR
 *                 estimatedFare: 380
 *                 baseFare: 80
 *                 distanceFare: 150
 *                 durationFare: 60
 *                 platformFee: 15
 *                 bookingFee: 10
 *                 waitingCharge: 15
 *                 airportCharge: 0
 *                 tollCharge: 50
 *                 surgeMultiplier: 1
 *                 surgeAmount: 0
 *                 gstAmount: 19
 *                 discountAmount: 100
 *                 finalFare: 299
 *
 *       400:
 *         description: Validation failed or invalid fare calculation request.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Validation failed.
 *
 *       404:
 *         description: Pricing configuration not found.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Pricing configuration not found.
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error.
 */
router.post("/calculate", validate(calculateFareSchema), calculateRideFare);

module.exports = router;
