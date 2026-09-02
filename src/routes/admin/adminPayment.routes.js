const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const {
  getAllPayments,
  getPayment,
  getStatistics,
  getRevenueReport,
  updateStatus,
  retry,
  refund,
} = require("../../controllers/admin/adminPayment.controller");

const { validate } = require("../../middleware/validate.middleware");

const {
  paymentIdParamSchema,
  getPaymentsQuerySchema,
  revenueReportQuerySchema,
  updatePaymentStatusSchema,
} = require("../../validators/admin/adminPayment.validator");

// =====================================================
// PAYMENT LIST
// =====================================================

router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(getPaymentsQuerySchema),
  getAllPayments,
);

// =====================================================
// PAYMENT STATISTICS
// =====================================================

router.get(
  "/stats",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  getStatistics,
);

// =====================================================
// REVENUE REPORT
// =====================================================

router.get(
  "/reports/revenue",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(revenueReportQuerySchema),
  getRevenueReport,
);

// =====================================================
// REFUND PAYMENT
// =====================================================

router.post(
  "/:id/refund",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  refund,
);

// =====================================================
// RETRY PAYMENT
// =====================================================

router.post(
  "/:id/retry",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  retry,
);

// =====================================================
// PAYMENT DETAILS
// =====================================================

router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(paymentIdParamSchema),
  getPayment,
);

// =====================================================
// UPDATE PAYMENT STATUS
// =====================================================

router.patch(
  "/:id/status",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  validate(updatePaymentStatusSchema),
  updateStatus,
);

module.exports = router;
