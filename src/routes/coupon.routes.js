const express = require("express");

const couponController = require("../controllers/coupon.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const { validate } = require("../middleware/validate.middleware");

const {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
  validateCouponSchema,
  applyCouponSchema,
} = require("../validators/coupon.validator");

const router = express.Router();

/**
 * @swagger
 * /api/coupons/available:
 *   get:
 *     summary: Get available coupons
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available coupons fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Coupon'
 */

/**
 * ============================================================
 * User Routes
 * ============================================================
 */

router.get("/available", authenticate, couponController.getAvailableCoupons);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate coupon before applying
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon validated successfully
 *       400:
 *         description: Invalid coupon
 */

router.post(
  "/validate",
  authenticate,
  validate(validateCouponSchema),
  couponController.validateCoupon,
);

/**
 * @swagger
 * /api/coupons/apply:
 *   post:
 *     summary: Apply coupon to ride
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplyCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Coupon cannot be applied
 */

router.post(
  "/apply",
  authenticate,
  validate(applyCouponSchema),
  couponController.applyCoupon,
);

/**
 * ============================================================
 * Admin Routes
 * ============================================================
 */

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create new coupon (Admin)
 *     tags: [Coupons]
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
 *         description: Validation error
 */

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCouponSchema),
  couponController.createCoupon,
);

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupons fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Coupon'
 */

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  couponController.getAllCoupons,
);

/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Get coupon by ID (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cmsal95ab0001wva8f7ds87xx
 *     responses:
 *       200:
 *         description: Coupon fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       404:
 *         description: Coupon not found
 */

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(couponIdParamSchema),
  couponController.getCouponById,
);

/**
 * @swagger
 * /api/coupons/{id}/activate:
 *   patch:
 *     summary: Activate coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cmsal95ab0001wva8f7ds87xx
 *     responses:
 *       200:
 *         description: Coupon activated successfully
 */

router.patch(
  "/:id/activate",
  authenticate,
  authorize("ADMIN"),
  validate(couponIdParamSchema),
  couponController.activateCoupon,
);

/**
 * @swagger
 * /api/coupons/{id}/deactivate:
 *   patch:
 *     summary: Deactivate coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cmsal95ab0001wva8f7ds87xx
 *     responses:
 *       200:
 *         description: Coupon deactivated successfully
 */

router.patch(
  "/:id/deactivate",
  authenticate,
  authorize("ADMIN"),
  validate(couponIdParamSchema),
  couponController.deactivateCoupon,
);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Update coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cmsal95ab0001wva8f7ds87xx
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       404:
 *         description: Coupon not found
 */

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(couponIdParamSchema),
  validate(updateCouponSchema),
  couponController.updateCoupon,
);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Delete coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cmsal95ab0001wva8f7ds87xx
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       404:
 *         description: Coupon not found
 */

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(couponIdParamSchema),
  couponController.deleteCoupon,
);

module.exports = router;
