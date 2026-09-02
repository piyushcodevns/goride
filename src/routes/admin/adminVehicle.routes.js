const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const {
  getAllVehicles,
  getVehicle,
  updateVehicleController,
  approveVehicleController,
  rejectVehicleController,
  getVehicleDocumentsController,
  deleteVehicleController,
} = require("../../controllers/admin/adminVehicle.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Vehicle Management
 *   description: Admin vehicle management APIs
 */

/**
 * GET /api/admin/vehicles
 * All vehicles
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getAllVehicles,
);

/**
 * GET /api/admin/vehicles/:id
 * Vehicle details
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getVehicle,
);

/**
 * PATCH /api/admin/vehicles/:id
 * Update vehicle
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  updateVehicleController,
);

/**
 * POST /api/admin/vehicles/:id/approve
 * Approve vehicle
 */
router.post(
  "/:id/approve",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  approveVehicleController,
);

/**
 * POST /api/admin/vehicles/:id/reject
 * Reject vehicle
 */
router.post(
  "/:id/reject",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  rejectVehicleController,
);

/**
 * GET /api/admin/vehicles/:id/documents
 * Get vehicle documents
 */
router.get(
  "/:id/documents",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getVehicleDocumentsController,
);

/**
 * DELETE /api/admin/vehicles/:id
 * Delete vehicle
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  deleteVehicleController,
);

module.exports = router;
