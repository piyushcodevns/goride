const express = require("express");

const { authorize } = require("../middleware/authorize.middleware");

const router = express.Router();

const {
  createPayment,
  getPaymentByRide,
  updatePaymentStatus,
  getMyPayments,
} = require("../controllers/payment.controller");

const { authenticate } = require("../middleware/auth.middleware");

/**
 * Create Payment
 */
router.post(
  "/create",
  authenticate,
  createPayment
);

/**
 * Payment History
 */
router.get(
  "/history",
  authenticate,
  getMyPayments
);

/**
 * Get Payment By Ride
 */
router.get(
  "/ride/:rideId",
  authenticate,
  getPaymentByRide
);

/**
 * Update Payment Status
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  updatePaymentStatus
);

module.exports = router;