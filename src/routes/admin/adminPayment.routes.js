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
  updateStatus,
} = require("../../controllers/admin/adminPayment.controller");

const { validate } = require("../../middleware/validate.middleware");

const {
  paymentIdParamSchema,
  getPaymentsQuerySchema,
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