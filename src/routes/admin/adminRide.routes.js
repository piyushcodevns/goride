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
 * GET /api/admin/rides
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getRidesQuerySchema),
  getAllRides,
);

/**
 * GET /api/admin/rides/stats
 */
router.get(
  "/stats",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  getStatistics,
);

/**
 * GET /api/admin/rides/user/:userId
 */
router.get(
  "/user/:userId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getUserRidesSchema),
  getRidesByUser,
);

/**
 * GET /api/admin/rides/driver/:driverId
 */
router.get(
  "/driver/:driverId",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(getDriverRidesSchema),
  getRidesByDriver,
);

/**
 * POST /api/admin/rides/:id/assign
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
 * POST /api/admin/rides/:id/reassign
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
 * POST /api/admin/rides/:id/force-complete
 */
router.post(
  "/:id/force-complete",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  forceComplete,
);

/**
 * GET /api/admin/rides/:id
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getRide,
);

/**
 * PATCH /api/admin/rides/:id/status
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
 * POST /api/admin/rides/:id/cancel
 */
router.post(
  "/:id/cancel",
  adminAuthMiddleware,
  requirePermission("ride:manage"),
  validate(rideIdParamSchema),
  cancel,
);

/**
 * GET /api/admin/rides/:id/timeline
 */
router.get(
  "/:id/timeline",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getTimeline,
);

/**
 * GET /api/admin/rides/:id/logs
 */
router.get(
  "/:id/logs",
  adminAuthMiddleware,
  requirePermission("ride:view"),
  validate(rideIdParamSchema),
  getLogs,
);

module.exports = router;
