const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const { validate } = require("../../middleware/validate.middleware");

const {
  createPricingSchema,
  updatePricingSchema,
  pricingIdParamSchema,
  getAllPricingQuerySchema,
} = require("../../validators/adminPricing.validator");

const {
  getAllPricing,
  getPricingById,
  createPricing,
  updatePricing,
  deletePricing,
} = require("../../controllers/admin/adminPricing.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Pricing Management
 *   description: Admin pricing configuration management APIs
 */

/**
 * @swagger
 * /api/admin/pricing:
 *   get:
 *     summary: List all pricing configurations
 *     tags: [Admin Pricing Management]
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
 *     responses:
 *       200:
 *         description: Pricing rules retrieved successfully
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("pricing:view"),
  validate(getAllPricingQuerySchema),
  getAllPricing,
);

/**
 * @swagger
 * /api/admin/pricing/{id}:
 *   get:
 *     summary: Get pricing configuration details by ID
 *     tags: [Admin Pricing Management]
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
 *         description: Pricing configuration retrieved successfully
 *       404:
 *         description: Pricing configuration not found
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:view"),
  validate(pricingIdParamSchema),
  getPricingById,
);

/**
 * @swagger
 * /api/admin/pricing:
 *   post:
 *     summary: Create a new pricing configuration rule
 *     tags: [Admin Pricing Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleType, baseFare, perKmRate, perMinuteRate]
 *             properties:
 *               vehicleType:
 *                 type: string
 *               baseFare:
 *                 type: number
 *               perKmRate:
 *                 type: number
 *               perMinuteRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Pricing configuration created successfully
 */
router.post(
  "/",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(createPricingSchema),
  createPricing,
);

/**
 * @swagger
 * /api/admin/pricing/{id}:
 *   patch:
 *     summary: Update a pricing configuration rule
 *     tags: [Admin Pricing Management]
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
 *               baseFare:
 *                 type: number
 *               perKmRate:
 *                 type: number
 *               perMinuteRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Pricing configuration updated successfully
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(updatePricingSchema),
  updatePricing,
);

/**
 * @swagger
 * /api/admin/pricing/{id}:
 *   delete:
 *     summary: Delete a pricing configuration rule
 *     tags: [Admin Pricing Management]
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
 *         description: Pricing configuration deleted successfully
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(pricingIdParamSchema),
  deletePricing,
);

module.exports = router;
