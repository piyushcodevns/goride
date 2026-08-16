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
  deleteVehicleController,
} = require("../../controllers/admin/adminVehicle.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Vehicle Management
 *   description: Admin vehicle management APIs
 */

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     description: Get paginated vehicles with search and vehicle type filtering.
 *     tags:
 *       - Admin Vehicle Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getAllVehicles,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   get:
 *     summary: Get vehicle details
 *     description: Get vehicle details with associated driver information.
 *     tags:
 *       - Admin Vehicle Management
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getVehicle,
);

/**
 * Update vehicle.
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  updateVehicleController,
);

/**
 * Delete vehicle.
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  deleteVehicleController,
);
module.exports = router;
