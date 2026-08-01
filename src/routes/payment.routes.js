const express = require("express");

const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorize.middleware");
const { validate } = require("../middleware/validate.middleware");

const {
  createPayment,
  getPaymentByRide,
  updatePaymentStatus,
  getMyPayments,
} = require("../controllers/payment.controller");

const {
  createPaymentSchema,
  updatePaymentStatusSchema,
} = require("../validators/payment.validator");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment Management APIs
 */

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     summary: Create payment
 *     description: Creates a payment for a completed ride.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request or ride not completed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Ride not found.
 *       409:
 *         description: Payment already exists.
 */
router.post(
  "/create",
  authenticate,
  validate(createPaymentSchema),
  createPayment
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get my payment history
 *     description: Returns all payments of the logged-in user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized.
 */
router.get(
  "/history",
  authenticate,
  getMyPayments
);

/**
 * @swagger
 * /api/payments/ride/{rideId}:
 *   get:
 *     summary: Get payment by ride ID
 *     description: Returns payment details of a specific ride.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Payment fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Payment not found.
 */
router.get(
  "/ride/:rideId",
  authenticate,
  getPaymentByRide
);

/**
 * @swagger
 * /api/payments/{id}/status:
 *   patch:
 *     summary: Update payment status
 *     description: |
 *       Updates payment status using the allowed lifecycle.
 *
 *       Allowed Flow:
 *
 *       PENDING → PROCESSING
 *
 *       PROCESSING → SUCCESS
 *
 *       PROCESSING → FAILED
 *
 *       SUCCESS → REFUNDED
 *
 *       Only Admin users can perform this operation.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentStatusRequest'
 *     responses:
 *       200:
 *         description: Payment status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid payment status transition.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Payment not found.
 *       409:
 *         description: Duplicate transaction ID.
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate(updatePaymentStatusSchema),
  updatePaymentStatus
);

module.exports = router;