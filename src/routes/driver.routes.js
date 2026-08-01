const express = require("express");
const router = express.Router();

const {
  register,
  getProfile,
  updateProfile,
  updateAvailabilityController,
  approveDriverController,
} = require("../controllers/driver.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const { validate } = require("../middleware/validate.middleware");

const {
  registerDriverSchema,
  approveDriverSchema,
} = require("../validators/driver.validator");
/**
 * @swagger
 * tags:
 *   name: Driver
 *   description: Driver Management APIs
 */

/**
 * @swagger
 * /api/driver/register:
 *   post:
 *     summary: Register a user as a driver
 *     description: Converts an authenticated user account into a driver account.
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Driver registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation failed or user is already registered as driver.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/profile:
 *   get:
 *     summary: Get driver profile
 *     description: Returns the authenticated driver's profile information.
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Driver profile not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/profile:
 *   patch:
 *     summary: Update driver profile
 *     description: Updates the authenticated driver's profile information.
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDriverRequest'
 *     responses:
 *       200:
 *         description: Driver profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Driver profile not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/availability:
 *   patch:
 *     summary: Update driver availability
 *     description: Updates the authenticated driver's availability status (OFFLINE, AVAILABLE, BUSY).
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability
 *             properties:
 *               availability:
 *                 type: string
 *                 enum:
 *                   - OFFLINE
 *                   - AVAILABLE
 *                   - BUSY
 *                 example: AVAILABLE
 *     responses:
 *       200:
 *         description: Driver availability updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid availability status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Driver profile not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/{driverId}/status:
 *   patch:
 *     summary: Approve or Reject Driver
 *     description: Allows an admin to approve or reject a pending driver registration.
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - APPROVED
 *                   - REJECTED
 *                 example: APPROVED
 *     responses:
 *       200:
 *         description: Driver status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request or invalid status transition.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */

// Driver Registration
router.post(
  "/register",
  authenticate,
  validate(registerDriverSchema),
  register
);

// Driver Profile
router.get("/profile", authenticate, getProfile);

// Update Driver Profile
router.patch("/profile", authenticate, updateProfile);

// Update Driver Availability
router.patch("/availability", authenticate, updateAvailabilityController);

/**
 * Approve / Reject Driver (Admin Only)
 */
router.patch(
  "/:driverId/status",
  authenticate,
  authorize("ADMIN"),
  validate(approveDriverSchema),
  approveDriverController
);

module.exports = router;
