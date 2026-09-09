const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getAllCoupons,
  activateCoupon,
  deactivateCoupon,
  getCouponUsages,
  getCouponUsageAnalytics,
  getExpiredCoupons,
  getCouponReport,
} = require("../../controllers/coupon.controller");

const { validate } = require("../../middleware/validate.middleware");

const {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
  getAllCouponsQuerySchema,
} = require("../../validators/coupon.validator");

/**
 * @swagger
 * tags:
 *   name: Admin Coupon Management
 *   description: Admin coupon creation, lifecycle, limits, and analytics APIs
 */

/**
 * @swagger
 * /api/admin/coupons:
 *   get:
 *     summary: List all coupons with filters
 *     tags: [Admin Coupon Management]
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
 *         description: Coupons retrieved successfully
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(getAllCouponsQuerySchema),
  getAllCoupons,
);

/**
 * @swagger
 * /api/admin/coupons/reports:
 *   get:
 *     summary: Generate comprehensive coupon usage and discount report
 *     tags: [Admin Coupon Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon report generated successfully
 */
router.get(
  "/reports",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  getCouponReport,
);

/**
 * @swagger
 * /api/admin/coupons/expired:
 *   get:
 *     summary: List all expired coupons
 *     tags: [Admin Coupon Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired coupons retrieved successfully
 */
router.get(
  "/expired",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  getExpiredCoupons,
);

/**
 * @swagger
 * /api/admin/coupons:
 *   post:
 *     summary: Create a new discount coupon
 *     tags: [Admin Coupon Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCouponRequest'
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Coupon code already exists
 */
router.post(
  "/",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(createCouponSchema),
  createCoupon,
);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   get:
 *     summary: Get coupon details by ID
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon details retrieved successfully
 *       404:
 *         description: Coupon not found
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponById,
);

/**
 * @swagger
 * /api/admin/coupons/{id}/usages:
 *   get:
 *     summary: Get usage logs for a specific coupon
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon usages retrieved successfully
 */
router.get(
  "/:id/usages",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponUsages,
);

/**
 * @swagger
 * /api/admin/coupons/{id}/analytics:
 *   get:
 *     summary: Get performance and redemption analytics for a coupon
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon analytics retrieved successfully
 */
router.get(
  "/:id/analytics",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponUsageAnalytics,
);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   patch:
 *     summary: Update coupon rules or limits
 *     tags: [Admin Coupon Management]
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
 *             $ref: '#/components/schemas/UpdateCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 */
router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  validate(updateCouponSchema),
  updateCoupon,
);

/**
 * @swagger
 * /api/admin/coupons/{id}/activate:
 *   patch:
 *     summary: Activate a deactivated coupon
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon activated successfully
 */
router.patch(
  "/:id/activate",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  activateCoupon,
);

/**
 * @swagger
 * /api/admin/coupons/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a coupon
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon deactivated successfully
 */
router.patch(
  "/:id/deactivate",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  deactivateCoupon,
);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon
 *     tags: [Admin Coupon Management]
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
 *         description: Coupon deleted successfully
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  deleteCoupon,
);

module.exports = router;