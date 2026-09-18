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

/**
 * @swagger
 * tags:
 *   name: Admin Payment Management
 *   description: Admin payment tracking, revenue analytics, and refund operations
 */

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: List all system payments
 *     tags: [Admin Payment Management]
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
 *           enum: [PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED]
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(getPaymentsQuerySchema),
  getAllPayments,
);

/**
 * @swagger
 * /api/admin/payments/stats:
 *   get:
 *     summary: Get payment aggregated statistics
 *     tags: [Admin Payment Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 */
router.get(
  "/stats",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  getStatistics,
);

/**
 * @swagger
 * /api/admin/payments/reports/revenue:
 *   get:
 *     summary: Generate revenue financial report
 *     tags: [Admin Payment Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Revenue report generated successfully
 */
router.get(
  "/reports/revenue",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(revenueReportQuerySchema),
  getRevenueReport,
);

/**
 * @swagger
 * /api/admin/payments/{id}/refund:
 *   post:
 *     summary: Refund a successful payment
 *     tags: [Admin Payment Management]
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
 *         description: Payment refunded successfully
 *       400:
 *         description: Only successful payments can be refunded
 */
router.post(
  "/:id/refund",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  refund,
);

/**
 * @swagger
 * /api/admin/payments/{id}/retry:
 *   post:
 *     summary: Retry a failed payment transaction
 *     tags: [Admin Payment Management]
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
 *         description: Payment retry initialized
 */
router.post(
  "/:id/retry",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  retry,
);

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Admin Payment Management]
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
 *         description: Payment details retrieved successfully
 *       404:
 *         description: Payment not found
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("payment:view"),
  validate(paymentIdParamSchema),
  getPayment,
);

/**
 * @swagger
 * /api/admin/payments/{id}/status:
 *   patch:
 *     summary: Update payment status administratively
 *     tags: [Admin Payment Management]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 */
router.patch(
  "/:id/status",
  adminAuthMiddleware,
  requirePermission("payment:manage"),
  validate(paymentIdParamSchema),
  validate(updatePaymentStatusSchema),
  updateStatus,
);

module.exports = router;
