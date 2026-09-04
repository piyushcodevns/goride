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
 * GET /api/admin/pricing
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("pricing:view"),
  validate(getAllPricingQuerySchema),
  getAllPricing,
);

/**
 * GET /api/admin/pricing/:id
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:view"),
  validate(pricingIdParamSchema),
  getPricingById,
);

/**
 * POST /api/admin/pricing
 */
router.post(
  "/",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(createPricingSchema),
  createPricing,
);

/**
 * PATCH /api/admin/pricing/:id
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(updatePricingSchema),
  updatePricing,
);

/**
 * DELETE /api/admin/pricing/:id
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("pricing:manage"),
  validate(pricingIdParamSchema),
  deletePricing,
);

module.exports = router;
