const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/requirePermission.middleware");

const {
  getAllUsers,
  getUser,
  getRideHistory,
  getPaymentHistory,
  getCouponHistory,
  getNotifications,
  activate,
  suspend,
} = require("../../controllers/admin/adminUser.controller");

// =====================================================
// USER LIST & DETAILS
// =====================================================

router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getAllUsers,
);

router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getUser,
);

// =====================================================
// USER HISTORY
// =====================================================

router.get(
  "/:id/rides",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getRideHistory,
);

router.get(
  "/:id/payments",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getPaymentHistory,
);

router.get(
  "/:id/coupons",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getCouponHistory,
);

router.get(
  "/:id/notifications",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getNotifications,
);

// =====================================================
// USER STATUS MANAGEMENT
// =====================================================

router.patch(
  "/:id/activate",
  adminAuthMiddleware,
  requirePermission("user:manage"),
  activate,
);

router.patch(
  "/:id/suspend",
  adminAuthMiddleware,
  requirePermission("user:manage"),
  suspend,
);

module.exports = router;
