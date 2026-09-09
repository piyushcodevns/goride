const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const {
  getAllRides,
  getRide,
  getStatistics,
  getRidesByUser,
  getRidesByDriver,
  updateStatus,
  cancel,
  assign,
  reassign,
  forceComplete,
  getTimeline,
  getLogs,
} = require("../../controllers/admin/adminRide.controller");

const { validate } = require("../../middleware/validate.middleware");

const {
  rideIdParamSchema,
  getUserRidesSchema,
  getDriverRidesSchema,
  getRidesQuerySchema,
  updateRideStatusSchema,
  assignDriverSchema,
  reassignDriverSchema,
} = require("../../validators/admin/adminRide.validator");

/**
 * @swagger
 * tags:
 *   name: Admin Ride Management
 *   description: Admin ride lifecycle monitoring and control APIs
 */

/**
 * @swagger
 * /api/admin/rides:
 *   get:
 *     summary: List all rides with filters and pagination
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rides retrieved successfully
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getRidesQuerySchema),
  getAllRides,
);

/**
 * @swagger
 * /api/admin/rides/stats:
 *   get:
 *     summary: Get ride aggregated statistics
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ride statistics retrieved successfully
 */
router.get(
  "/stats",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  getStatistics,
);

/**
 * @swagger
 * /api/admin/rides/user/{userId}:
 *   get:
 *     summary: Get all rides for a specific user
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User rides retrieved successfully
 */
router.get(
  "/user/:userId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getUserRidesSchema),
  getRidesByUser,
);

/**
 * @swagger
 * /api/admin/rides/driver/{driverId}:
 *   get:
 *     summary: Get all rides for a specific driver
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver rides retrieved successfully
 */
router.get(
  "/driver/:driverId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getDriverRidesSchema),
  getRidesByDriver,
);

/**
 * @swagger
 * /api/admin/rides/{id}/assign:
 *   post:
 *     summary: Assign a driver to a ride
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 */
router.post(
  "/:id/assign",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  validate(assignDriverSchema),
  assign,
);

/**
 * @swagger
 * /api/admin/rides/{id}/reassign:
 *   post:
 *     summary: Reassign ride to a different driver
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ride reassigned successfully
 */
router.post(
  "/:id/reassign",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  validate(reassignDriverSchema),
  reassign,
);

/**
 * @swagger
 * /api/admin/rides/{id}/force-complete:
 *   post:
 *     summary: Force complete an active ride
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride force completed successfully
 */
router.post(
  "/:id/force-complete",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  forceComplete,
);

/**
 * @swagger
 * /api/admin/rides/{id}:
 *   get:
 *     summary: Get ride details by ID
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride details retrieved successfully
 *       404:
 *         description: Ride not found
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getRide,
);

/**
 * @swagger
 * /api/admin/rides/{id}/status:
 *   patch:
 *     summary: Update ride status
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ride status updated successfully
 */
router.patch(
  "/:id/status",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  validate(updateRideStatusSchema),
  updateStatus,
);

/**
 * @swagger
 * /api/admin/rides/{id}/cancel:
 *   post:
 *     summary: Cancel a ride administratively
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride cancelled successfully
 */
router.post(
  "/:id/cancel",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  cancel,
);

/**
 * @swagger
 * /api/admin/rides/{id}/timeline:
 *   get:
 *     summary: Get ride status transition timeline
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride timeline retrieved successfully
 */
router.get(
  "/:id/timeline",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getTimeline,
);

/**
 * @swagger
 * /api/admin/rides/{id}/logs:
 *   get:
 *     summary: Get ride system activity logs
 *     tags: [Admin Ride Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride logs retrieved successfully
 */
router.get(
  "/:id/logs",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getLogs,
);

module.exports = router;
