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

// =====================================================
// COUPON LIST
// =====================================================

router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(getAllCouponsQuerySchema),
  getAllCoupons,
);

// =====================================================
// COUPON REPORT
// =====================================================

router.get(
  "/reports",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  getCouponReport,
);

// =====================================================
// EXPIRED COUPONS
// =====================================================

router.get(
  "/expired",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  getExpiredCoupons,
);

// =====================================================
// CREATE COUPON
// =====================================================

router.post(
  "/",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(createCouponSchema),
  createCoupon,
);

// =====================================================
// COUPON DETAILS
// =====================================================

router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponById,
);

// =====================================================
// COUPON USAGES
// =====================================================

router.get(
  "/:id/usages",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponUsages,
);

// =====================================================
// COUPON USAGE ANALYTICS
// =====================================================

router.get(
  "/:id/analytics",
  adminAuthMiddleware,
  requirePermission("coupon:view"),
  validate(couponIdParamSchema),
  getCouponUsageAnalytics,
);

// =====================================================
// UPDATE COUPON
// =====================================================

router.patch(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  validate(updateCouponSchema),
  updateCoupon,
);

// =====================================================
// ACTIVATE COUPON
// =====================================================

router.patch(
  "/:id/activate",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  activateCoupon,
);

// =====================================================
// DEACTIVATE COUPON
// =====================================================

router.patch(
  "/:id/deactivate",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  deactivateCoupon,
);

// =====================================================
// DELETE COUPON
// =====================================================

router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("coupon:manage"),
  validate(couponIdParamSchema),
  deleteCoupon,
);

module.exports = router;