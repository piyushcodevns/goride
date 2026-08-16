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
} = require("../../controllers/admin/adminRide.controller");

const { validate } = require("../../middleware/validate.middleware");

const {
  rideIdParamSchema,
  userIdParamSchema,
  driverIdParamSchema,
  paginationSchema,
  getRidesQuerySchema,
} = require("../../validators/admin/adminRide.validator");

// =====================================================
// RIDE LIST
// =====================================================

/**
 * @swagger
 * /api/admin/rides:
 *   get:
 *     summary: Get all rides
 *     description: Get paginated rides with search and filter support.
 *     tags:
 *       - Admin Ride Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getRidesQuerySchema),
  getAllRides,
);

// =====================================================
// RIDE STATISTICS
// =====================================================

/**
 * @swagger
 * /api/admin/rides/stats:
 *   get:
 *     summary: Get ride statistics
 *     tags:
 *       - Admin Ride Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/stats",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  getStatistics,
);

// =====================================================
// RIDES BY USER
// =====================================================

/**
 * @swagger
 * /api/admin/rides/user/{userId}:
 *   get:
 *     summary: Get rides by user
 *     tags:
 *       - Admin Ride Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/user/:userId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(userIdParamSchema.merge(paginationSchema)),
  getRidesByUser,
);

// =====================================================
// RIDES BY DRIVER
// =====================================================

/**
 * @swagger
 * /api/admin/rides/driver/{driverId}:
 *   get:
 *     summary: Get rides by driver
 *     tags:
 *       - Admin Ride Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/driver/:driverId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(driverIdParamSchema.merge(paginationSchema)),
  getRidesByDriver,
);
// =====================================================
// RIDE DETAILS
// =====================================================

/**
 * @swagger
 * /api/admin/rides/{id}:
 *   get:
 *     summary: Get ride details
 *     tags:
 *       - Admin Ride Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getRide,
);

module.exports = router;
