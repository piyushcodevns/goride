const prisma = require("../config/prisma");
const paymentRepository = require("../repositories/payment.repository");
const rideRepository = require("../repositories/ride.repository");
const couponRepository = require("../repositories/coupon.repository");
const razorpayGateway = require("../gateways/razorpay.gateway");
const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");
const { config } = require("../config/env");
const logger = require("../utils/logger");

const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../utils/AppError");

/**
 * Allowed Payment Status Flow
 */
const PAYMENT_STATUS_FLOW = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCESS", "FAILED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

/**
 * Create Payment for Completed Ride (Cash / Legacy flow)
 */
const createPayment = async ({
  rideId,
  userId,
  paymentMethod,
  gateway = null,
}) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new ForbiddenError("Unauthorized payment request.");
  }

  if (ride.status !== "COMPLETED") {
    throw new BadRequestError(
      "Payment can only be created after ride completion.",
    );
  }

  const existingPayment = await paymentRepository.getPaymentByRideId(rideId);

  if (existingPayment) {
    throw new ConflictError("Payment already exists for this ride.");
  }

  if (
    ride.finalFare === null ||
    ride.finalFare === undefined ||
    Number(ride.finalFare) <= 0
  ) {
    throw new BadRequestError("Invalid ride fare. Payment cannot be created.");
  }

  return paymentRepository.createPayment({
    rideId,
    userId,
    amount: ride.finalFare,
    paymentMethod,
    gateway,
  });
};

/**
 * Verify Online Payment (Called from Frontend callback)
 */
const verifyOnlinePayment = async ({
  rideId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
}) => {
  if (!rideId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new BadRequestError("All payment verification parameters are required.");
  }

  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new ForbiddenError("Unauthorized payment verification request.");
  }

  const payment = await paymentRepository.getPaymentByRideId(rideId);

  if (!payment) {
    throw new NotFoundError("Payment record not found for this ride.");
  }

  // Require supplied Razorpay order ID to match saved payment's orderId.
  // Reject missing or mismatched saved order IDs; do not make conditional on payment.orderId being truthy.
  if (!payment.orderId || payment.orderId !== razorpayOrderId) {
    throw new BadRequestError("Razorpay order ID does not match the payment order for this ride.");
  }

  // Idempotency: If already verified with this payment ID, return clean success
  if (payment.status === "SUCCESS" && payment.transactionId === razorpayPaymentId) {
    return {
      success: true,
      alreadyVerified: true,
      payment,
      ride,
    };
  }

  // Before changing any state, require the ride to be PAYMENT_PENDING.
  // A cancelled or otherwise non-pending ride must never transition back to REQUESTED.
  if (ride.status !== "PAYMENT_PENDING") {
    throw new ConflictError(`Cannot verify payment for ride in status '${ride.status}'.`);
  }

  // Cryptographic Signature Verification
  const isValid = razorpayGateway.verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    throw new BadRequestError("Invalid payment signature.");
  }

  // Atomic database transition with race condition protection
  const { updatedPayment, updatedRide, alreadyVerified } = await prisma.$transaction(async (tx) => {
    // Atomically lock and update only if ride is still PAYMENT_PENDING
    const rideUpdate = await tx.ride.updateMany({
      where: {
        id: ride.id,
        status: "PAYMENT_PENDING",
      },
      data: {
        status: "REQUESTED",
      },
    });

    if (rideUpdate.count === 0) {
      // Check current state under transaction
      const currentRide = await tx.ride.findUnique({
        where: { id: ride.id },
        include: { payment: true },
      });

      // Race-safe idempotency: If another concurrent transaction already verified this payment ID
      if (
        currentRide &&
        currentRide.payment &&
        currentRide.payment.status === "SUCCESS" &&
        currentRide.payment.transactionId === razorpayPaymentId
      ) {
        return {
          updatedPayment: currentRide.payment,
          updatedRide: currentRide,
          alreadyVerified: true,
        };
      }

      throw new ConflictError(
        `Cannot verify payment for ride in status '${currentRide ? currentRide.status : "UNKNOWN"}'.`
      );
    }

    const p = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        transactionId: razorpayPaymentId,
        orderId: razorpayOrderId,
        razorpaySignature,
        paidAt: new Date(),
      },
    });

    const r = await tx.ride.findUnique({
      where: { id: ride.id },
    });

    // Commit coupon usage if applied
    if (ride.couponId) {
      await couponRepository.incrementCouponUsageTx(tx, ride.couponId);
    }

    return { updatedPayment: p, updatedRide: r, alreadyVerified: false };
  });

  if (alreadyVerified) {
    return {
      success: true,
      alreadyVerified: true,
      payment: updatedPayment,
      ride: updatedRide,
    };
  }

  // Post-transaction side effects
  if (ride.isScheduled && ride.scheduledFor) {
    try {
      const { addScheduledRideActivationJob } = require("../queues/scheduledRide.queue");
      await addScheduledRideActivationJob({
        rideId: ride.id,
        scheduledFor: ride.scheduledFor,
      });
    } catch (queueErr) {
      logger.warn("Scheduled ride activation queueing skipped or failed.", {
        rideId: ride.id,
        error: queueErr.message,
      });
    }
  }

  await notificationService.dispatchNotification(
    NotificationFactory.createPaymentSuccessNotification(updatedPayment)
  );

  await notificationService.dispatchNotification(
    NotificationFactory.createRideBookedNotification({
      userId: ride.userId,
      rideId: ride.id,
      pickup: ride.pickup,
      destination: ride.destination,
      status: "REQUESTED",
    })
  );

  return {
    success: true,
    payment: updatedPayment,
    ride: updatedRide,
  };
};

/**
 * Handle Razorpay Webhooks
 */
const handleRazorpayWebhook = async ({ rawBody, signature }) => {
  if (!rawBody || !signature) {
    throw new BadRequestError("Webhook raw body and signature are required.");
  }

  const isValid = razorpayGateway.verifyWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValid) {
    throw new BadRequestError("Invalid webhook signature.");
  }

  let eventData;
  try {
    eventData = typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    throw new BadRequestError("Malformed webhook JSON payload.");
  }

  const eventName = eventData.event;
  logger.info("Received Razorpay Webhook", { event: eventName });

  if (eventName === "payment.captured" || eventName === "order.paid") {
    const paymentEntity = eventData.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    const rideIdFromNotes = paymentEntity?.notes?.rideId;

    let payment = null;
    if (orderId) {
      payment = await paymentRepository.getPaymentByOrderId(orderId);
    }
    if (!payment && rideIdFromNotes) {
      payment = await paymentRepository.getPaymentByRideId(rideIdFromNotes);
    }

    if (!payment) {
      logger.warn("Webhook payment record not found", { orderId, rideIdFromNotes });
      return { received: true, ignored: true, reason: "Payment record not found." };
    }

    // Idempotency: Already SUCCESS
    if (payment.status === "SUCCESS") {
      return { received: true, alreadyProcessed: true };
    }

    // Require order ID match if payment record has orderId and webhook has orderId
    if (payment.orderId && orderId && payment.orderId !== orderId) {
      logger.warn("Webhook order ID mismatch with payment record", {
        expectedOrderId: payment.orderId,
        receivedOrderId: orderId,
        paymentId,
      });
      return {
        received: true,
        ignored: true,
        reason: "Order ID mismatch with payment record.",
      };
    }

    // Validate exact amount (in paise) and currency (INR)
    const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
    const receivedAmount = paymentEntity?.amount;
    const receivedCurrency = paymentEntity?.currency;

    if (receivedAmount === undefined || receivedAmount === null || Number(receivedAmount) !== expectedAmountPaise) {
      logger.warn("Webhook payment amount mismatch or missing", {
        expected: expectedAmountPaise,
        received: receivedAmount,
        paymentId,
      });
      return {
        received: true,
        ignored: true,
        reason: "Payment amount mismatch or missing.",
      };
    }

    if (!receivedCurrency || String(receivedCurrency).toUpperCase() !== "INR") {
      logger.warn("Webhook payment currency mismatch or missing", {
        expected: "INR",
        received: receivedCurrency,
        paymentId,
      });
      return {
        received: true,
        ignored: true,
        reason: "Payment currency mismatch or missing.",
      };
    }

    const ride = await rideRepository.getRideById(payment.rideId);
    if (!ride) {
      return { received: true, ignored: true, reason: "Ride not found." };
    }

    // Do not dispatch if ride was cancelled
    if (ride.status === "CANCELLED") {
      logger.warn("Payment captured for cancelled ride", { rideId: ride.id, paymentId });
      await paymentRepository.updatePaymentStatus(payment.id, {
        status: "SUCCESS",
        transactionId: paymentId,
        paidAt: new Date(),
      });
      return { received: true, reconciledCancelledRide: true };
    }

    // Atomically transition payment to SUCCESS and ride to REQUESTED with race-safety
    const { updatedPayment, updatedRide, alreadyProcessed, ignored } = await prisma.$transaction(async (tx) => {
      const rideUpdate = await tx.ride.updateMany({
        where: {
          id: ride.id,
          status: "PAYMENT_PENDING",
        },
        data: {
          status: "REQUESTED",
        },
      });

      if (rideUpdate.count === 0) {
        const currentRide = await tx.ride.findUnique({
          where: { id: ride.id },
          include: { payment: true },
        });

        if (
          currentRide &&
          currentRide.payment &&
          currentRide.payment.status === "SUCCESS"
        ) {
          return {
            updatedPayment: currentRide.payment,
            updatedRide: currentRide,
            alreadyProcessed: true,
          };
        }

        logger.warn("Webhook ride could not be transitioned from non-pending status", {
          rideId: ride.id,
          status: currentRide?.status,
        });
        return {
          updatedPayment: payment,
          updatedRide: currentRide,
          ignored: true,
        };
      }

      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          transactionId: paymentId,
          orderId: orderId || payment.orderId,
          paidAt: new Date(),
        },
      });

      const r = await tx.ride.findUnique({
        where: { id: ride.id },
      });

      if (ride.couponId) {
        await couponRepository.incrementCouponUsageTx(tx, ride.couponId);
      }

      return { updatedPayment: p, updatedRide: r, alreadyProcessed: false };
    });

    if (alreadyProcessed) {
      return { received: true, alreadyProcessed: true };
    }

    if (ignored || !updatedPayment || updatedPayment.status !== "SUCCESS") {
      return { received: true, ignored: true, reason: "Ride was not in PAYMENT_PENDING status." };
    }

    if (ride.isScheduled && ride.scheduledFor) {
      try {
        const { addScheduledRideActivationJob } = require("../queues/scheduledRide.queue");
        await addScheduledRideActivationJob({
          rideId: ride.id,
          scheduledFor: ride.scheduledFor,
        });
      } catch (queueErr) {
        logger.warn("Scheduled ride queue failed on webhook", { error: queueErr.message });
      }
    }

    await notificationService.dispatchNotification(
      NotificationFactory.createPaymentSuccessNotification(updatedPayment)
    );

    await notificationService.dispatchNotification(
      NotificationFactory.createRideBookedNotification({
        userId: ride.userId,
        rideId: ride.id,
        pickup: ride.pickup,
        destination: ride.destination,
        status: "REQUESTED",
      })
    );

    return { received: true, success: true, paymentId, rideId: ride.id };
  }

  if (eventName === "payment.failed") {
    const paymentEntity = eventData.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const rideIdFromNotes = paymentEntity?.notes?.rideId;

    let payment = null;
    if (orderId) {
      payment = await paymentRepository.getPaymentByOrderId(orderId);
    }
    if (!payment && rideIdFromNotes) {
      payment = await paymentRepository.getPaymentByRideId(rideIdFromNotes);
    }

    if (payment && payment.status !== "SUCCESS") {
      await paymentRepository.updatePaymentStatus(payment.id, {
        status: "FAILED",
      });
      return { received: true, markedFailed: true };
    }
  }

  return { received: true };
};

/**
 * Initiate or Retry Razorpay Order for Pending Ride
 */
const initiatePaymentOrder = async ({ rideId, userId }) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new ForbiddenError("Unauthorized.");
  }

  if (ride.status !== "PAYMENT_PENDING") {
    throw new BadRequestError("Ride is not pending payment.");
  }

  const existingPayment = await paymentRepository.getPaymentByRideId(rideId);
  if (existingPayment && existingPayment.status === "SUCCESS") {
    throw new BadRequestError("Payment for this ride is already completed.");
  }

  const amountPaise = Math.round(Number(ride.finalFare) * 100);
  const rzpOrder = await razorpayGateway.createOrder({
    amountPaise,
    currency: "INR",
    receipt: ride.id,
    notes: {
      rideId: ride.id,
      userId,
    },
  });

  const paymentRecord = await paymentRepository.upsertPaymentForRide({
    rideId: ride.id,
    userId,
    amount: ride.finalFare,
    paymentMethod: existingPayment?.paymentMethod || "UPI",
    status: "PENDING",
    gateway: "RAZORPAY",
    orderId: rzpOrder.id,
  });

  return {
    rideId: ride.id,
    orderId: rzpOrder.id,
    amount: Number(ride.finalFare),
    currency: "INR",
    keyId: config.razorpay?.keyId || null,
    paymentId: paymentRecord.id,
  };
};

/**
 * Get Payment by Ride
 */
const getPaymentByRide = async (rideId, currentUser) => {
  const payment = await paymentRepository.getPaymentByRideId(rideId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  if (payment.userId !== currentUser.id) {
    throw new ForbiddenError("You are not authorized to access this payment.");
  }

  return payment;
};

/**
 * Update Payment Status (Admin / Internal State Machine)
 */
const updatePaymentStatus = async (paymentId, status, transactionId = null) => {
  const sanitizedTransactionId = transactionId?.trim() || null;
  const payment = await paymentRepository.getPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  const allowedTransitions = PAYMENT_STATUS_FLOW[payment.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new BadRequestError(
      `Invalid payment status transition from ${payment.status} to ${status}.`,
    );
  }

  // Transaction ID is mandatory only for SUCCESS
  if (status === "SUCCESS" && !sanitizedTransactionId) {
    throw new BadRequestError(
      "Transaction ID is required for successful payment.",
    );
  }

  // Prevent duplicate transaction IDs
  if (sanitizedTransactionId) {
    const existingTransaction =
      await paymentRepository.getPaymentByTransactionId(sanitizedTransactionId);

    if (existingTransaction && existingTransaction.id !== payment.id) {
      throw new ConflictError("Transaction ID already exists.");
    }
  }

  const updateData = {
    status,
  };

  // Preserve original transactionId unless a new one is explicitly provided
  if (sanitizedTransactionId) {
    updateData.transactionId = sanitizedTransactionId;
  }

  if (status === "SUCCESS" && !payment.paidAt) {
    updateData.paidAt = new Date();
  }

  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentId,
    updateData,
  );

  if (status === "SUCCESS") {
    await notificationService.dispatchNotification(
      NotificationFactory.createPaymentSuccessNotification(updatedPayment),
    );
  }

  if (status === "FAILED") {
    await notificationService.dispatchNotification(
      NotificationFactory.createPaymentFailedNotification(updatedPayment),
    );
  }

  return updatedPayment;
};

/**
 * User Payment History
 */
const getMyPayments = async (userId) => {
  return paymentRepository.getUserPayments(userId);
};

module.exports = {
  createPayment,
  verifyOnlinePayment,
  handleRazorpayWebhook,
  initiatePaymentOrder,
  getPaymentByRide,
  updatePaymentStatus,
  getMyPayments,
};
