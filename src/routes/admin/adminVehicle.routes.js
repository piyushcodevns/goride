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
  approveVehicleDocumentController,
  rejectVehicleDocumentController,
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
 *     summary: List all registered vehicles
 *     tags: [Admin Vehicle Management]
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
 *           enum: [PENDING, APPROVED, REJECTED, SUSPENDED]
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [AUTO, BIKE, CAR, SEDAN, SUV, EV]
 *     responses:
 *       200:
 *         description: Vehicles retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
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
 *     summary: Get vehicle details by ID
 *     tags: [Admin Vehicle Management]
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
 *         description: Vehicle details retrieved successfully
 *       404:
 *         description: Vehicle not found
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getVehicle,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   patch:
 *     summary: Update vehicle attributes
 *     tags: [Admin Vehicle Management]
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
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Invalid input
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  updateVehicleController,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}/approve:
 *   post:
 *     summary: Approve a pending vehicle registration
 *     tags: [Admin Vehicle Management]
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
 *         description: Vehicle approved successfully
 *       400:
 *         description: Vehicle cannot be approved
 */
router.post(
  "/:id/approve",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  approveVehicleController,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}/reject:
 *   post:
 *     summary: Reject a pending vehicle registration
 *     tags: [Admin Vehicle Management]
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle rejected successfully
 */
router.post(
  "/:id/reject",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  rejectVehicleController,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}/documents:
 *   get:
 *     summary: Get all verification documents for a vehicle
 *     tags: [Admin Vehicle Management]
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
 *         description: Vehicle documents retrieved successfully
 */
router.get(
  "/:id/documents",
  adminAuthMiddleware,
  requirePermission("vehicle:view"),
  getVehicleDocumentsController,
);

/**
 * @swagger
 * /api/admin/vehicles/documents/{id}/approve:
 *   patch:
 *     summary: Approve a specific vehicle document
 *     tags: [Admin Vehicle Management]
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
 *         description: Document approved successfully
 */
router.patch(
  "/documents/:id/approve",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  approveVehicleDocumentController,
);

/**
 * @swagger
 * /api/admin/vehicles/documents/{id}/reject:
 *   patch:
 *     summary: Reject a specific vehicle document
 *     tags: [Admin Vehicle Management]
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document rejected successfully
 */
router.patch(
  "/documents/:id/reject",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  rejectVehicleDocumentController,
);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle record
 *     tags: [Admin Vehicle Management]
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
 *         description: Vehicle deleted successfully
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("vehicle:manage"),
  deleteVehicleController,
);

module.exports = router;
