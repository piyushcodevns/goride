process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";
process.env.RAZORPAY_KEY_ID = "rzp_test_mock_key_id_12345";
process.env.RAZORPAY_KEY_SECRET = "mock_razorpay_secret_key_67890";
process.env.RAZORPAY_WEBHOOK_SECRET = "mock_webhook_secret_abcde";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const paymentService = require("../src/services/payment.service");
const rideRepository = require("../src/repositories/ride.repository");
const couponRepository = require("../src/repositories/coupon.repository");
const notificationService = require("../src/services/notification.service");
const razorpayGateway = require("../src/gateways/razorpay.gateway");
const MapsCacheService = require("../src/services/maps-cache.service");
const { BadRequestError, ForbiddenError, ConflictError } = require("../src/utils/AppError");

describe("GoRide Payment Module: End-to-End Razorpay Integration & Hardening", () => {
  const uniqueId = Date.now();
  let riderUser, otherRider, driverUser, driverProfile, vehicleProfile;
  const mockKeySecret = "mock_razorpay_secret_key_67890";
  const mockWebhookSecret = "mock_webhook_secret_abcde";

  const generatePaymentSignature = (orderId, paymentId, secret = mockKeySecret) => {
    return crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  };

  const generateWebhookSignature = (rawBody, secret = mockWebhookSecret) => {
    return crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
  };

  test("Setup test fixtures: riders, driver, vehicle", async () => {
    riderUser = await prisma.user.create({
      data: {
        fullName: "Online Rider",
        email: `online_rider_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    otherRider = await prisma.user.create({
      data: {
        fullName: "Other Rider",
        email: `other_rider_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    driverUser = await prisma.user.create({
      data: {
        fullName: "Test Driver",
        email: `driver_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    driverProfile = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: `DL_${uniqueId.toString().slice(-6)}`,
        aadharNumber: `AA_${uniqueId.toString().slice(-6)}`,
        experience: 5,
        status: "APPROVED",
        availability: "AVAILABLE",
      },
    });

    vehicleProfile = await prisma.vehicle.create({
      data: {
        driverId: driverProfile.id,
        vehicleNumber: `DL01${uniqueId.toString().slice(-4)}`,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Maruti",
        model: "Swift",
        color: "White",
        seats: 4,
        status: "APPROVED",
      },
    });

    assert.ok(riderUser.id);
    assert.ok(driverProfile.id);

    const testRoutes = [
      ["28.570800", "77.326100", "28.564200", "77.334400", 5.2, 15],
      ["28.631500", "77.216700", "28.612900", "77.229500", 4.8, 12],
      ["28.556200", "77.100000", "28.498600", "77.087800", 12.0, 25],
      ["28.520800", "77.201400", "28.549400", "77.194200", 4.5, 12],
      ["28.549200", "77.252900", "28.570000", "77.240000", 3.8, 10],
      ["28.552100", "77.058300", "28.629500", "77.077900", 10.5, 22],
      ["28.667500", "77.228500", "28.656200", "77.230400", 2.2, 8],
      ["28.632800", "77.219700", "28.631000", "77.227000", 1.8, 6],
      ["28.549400", "77.194200", "28.558400", "77.207500", 2.5, 7],
    ];
    for (const [lat1, lon1, lat2, lon2, dist, dur] of testRoutes) {
      MapsCacheService.setRoute(lat1, lon1, lat2, lon2, {
        distance: dist,
        duration: dur,
        eta: `${dur} minutes`,
        trafficModel: "STATIC_ROUTE_ESTIMATE",
        isTrafficAware: false,
        isVehicleSpecific: false,
      });
    }
  });

  test("1. Cash Booking: Immediately creates ride with REQUESTED and driver-visible", async () => {
    const cashRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Sector 18 Noida",
      destination: "Botanical Garden Noida",
      pickupLatitude: 28.5708,
      pickupLongitude: 77.3261,
      destinationLatitude: 28.5642,
      destinationLongitude: 77.3344,
      vehicleType: "CAR",
      paymentMethod: "CASH",
    });

    assert.equal(cashRide.status, "REQUESTED");
    assert.ok(cashRide.finalFare > 0);

    // Verify driver sees this ride in available rides
    const availableRides = await rideService.getAvailableRides(driverProfile.id);
    const found = availableRides.find((r) => r.id === cashRide.id);
    assert.ok(found, "Cash ride must immediately be visible to available drivers");

    // Cancel to free rider active state
    await rideService.cancelRide(cashRide.id, riderUser.id);
  });

  test("2. Online UPI Booking: Initializes with PAYMENT_PENDING and NOT driver-visible", async () => {
    const upiRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Connaught Place Delhi",
      destination: "India Gate Delhi",
      pickupLatitude: 28.6315,
      pickupLongitude: 77.2167,
      destinationLatitude: 28.6129,
      destinationLongitude: 77.2295,
      vehicleType: "CAR",
      paymentMethod: "UPI",
    });

    assert.equal(upiRide.status, "PAYMENT_PENDING");
    assert.ok(upiRide.payment);
    assert.equal(upiRide.payment.status, "PENDING");
    assert.ok(upiRide.payment.orderId);
    assert.equal(upiRide.payment.paymentMethod, "UPI");

    // Verify drivers CANNOT see this ride while payment is pending
    const availableRides = await rideService.getAvailableRides(driverProfile.id);
    const found = availableRides.find((r) => r.id === upiRide.id);
    assert.equal(found, undefined, "PAYMENT_PENDING ride must NOT be visible to drivers");

    // Verify driver cannot assign/accept an unpaid ride
    await assert.rejects(
      async () => {
        await rideService.assignDriver(upiRide.id, driverProfile.id);
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        return true;
      }
    );

    // 3. Signature Verification Failure: Tampered signature rejected; ride remains PAYMENT_PENDING
    await assert.rejects(
      async () => {
        await paymentService.verifyOnlinePayment({
          rideId: upiRide.id,
          razorpayOrderId: upiRide.payment.orderId,
          razorpayPaymentId: "pay_tampered_12345",
          razorpaySignature: "invalid_tampered_hex_signature",
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid payment signature.");
        return true;
      }
    );

    const rideStillPending = await rideRepository.getRideById(upiRide.id);
    assert.equal(rideStillPending.status, "PAYMENT_PENDING");

    // 4. Unauthorized User Verification Rejection: Other user cannot verify another's payment
    const validPaymentId = `pay_${uniqueId}_001`;
    const validSig = generatePaymentSignature(upiRide.payment.orderId, validPaymentId);

    await assert.rejects(
      async () => {
        await paymentService.verifyOnlinePayment({
          rideId: upiRide.id,
          razorpayOrderId: upiRide.payment.orderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSig,
          userId: otherRider.id,
        });
      },
      (err) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );

    // 4a. Wrong Order ID Rejection: Mismatched order ID rejected even with valid signature
    const wrongOrderId = `order_${uniqueId}_mismatch`;
    const wrongOrderSig = generatePaymentSignature(wrongOrderId, validPaymentId);

    await assert.rejects(
      async () => {
        await paymentService.verifyOnlinePayment({
          rideId: upiRide.id,
          razorpayOrderId: wrongOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: wrongOrderSig,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Razorpay order ID does not match the payment order/);
        return true;
      }
    );

    // 5. Valid Signature Verification: Transitions payment to SUCCESS and ride to REQUESTED
    const verifyResult = await paymentService.verifyOnlinePayment({
      rideId: upiRide.id,
      razorpayOrderId: upiRide.payment.orderId,
      razorpayPaymentId: validPaymentId,
      razorpaySignature: validSig,
      userId: riderUser.id,
    });

    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.payment.status, "SUCCESS");
    assert.equal(verifyResult.payment.transactionId, validPaymentId);
    assert.equal(verifyResult.ride.status, "REQUESTED");

    // Now ride must be visible to drivers
    const availableAfterPay = await rideService.getAvailableRides(driverProfile.id);
    const foundAfterPay = availableAfterPay.find((r) => r.id === upiRide.id);
    assert.ok(foundAfterPay, "Verified ride must become visible to drivers");

    // 6. Idempotency: Duplicate verification request returns success without error or double dispatch
    const duplicateVerify = await paymentService.verifyOnlinePayment({
      rideId: upiRide.id,
      razorpayOrderId: upiRide.payment.orderId,
      razorpayPaymentId: validPaymentId,
      razorpaySignature: validSig,
      userId: riderUser.id,
    });
    assert.equal(duplicateVerify.success, true);
    assert.equal(duplicateVerify.alreadyVerified, true);

    // Clean up ride
    await rideService.cancelRide(upiRide.id, riderUser.id);
  });

  test("7. Webhook Handling: Valid payment.captured webhook atomically activates ride", async () => {
    const cardRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Indira Gandhi International Airport Delhi",
      destination: "Gurugram Cyber Hub",
      pickupLatitude: 28.5562,
      pickupLongitude: 77.1000,
      destinationLatitude: 28.4986,
      destinationLongitude: 77.0878,
      vehicleType: "CAR",
      paymentMethod: "CARD",
    });

    assert.equal(cardRide.status, "PAYMENT_PENDING");
    const orderId = cardRide.payment.orderId;
    const webhookPaymentId = `pay_hook_${uniqueId}_999`;

    const webhookBodyObj = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: orderId,
            amount: Math.round(Number(cardRide.finalFare) * 100),
            currency: "INR",
            status: "captured",
            notes: {
              rideId: cardRide.id,
              userId: riderUser.id,
            },
          },
        },
      },
    };

    const rawWebhookBody = JSON.stringify(webhookBodyObj);

    // Rejects missing/invalid webhook signature
    await assert.rejects(
      async () => {
        await paymentService.handleRazorpayWebhook({
          rawBody: rawWebhookBody,
          signature: "bad_signature_string",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid webhook signature.");
        return true;
      }
    );

    // Mismatched amount: must NOT mark SUCCESS or dispatch
    const wrongAmountBody = JSON.stringify({
      ...webhookBodyObj,
      payload: {
        payment: {
          entity: {
            ...webhookBodyObj.payload.payment.entity,
            id: `pay_hook_${uniqueId}_wrong_amt`,
            amount: 999999, // Mismatched amount
          },
        },
      },
    });
    const wrongAmountSig = generateWebhookSignature(wrongAmountBody);
    const wrongAmountResult = await paymentService.handleRazorpayWebhook({
      rawBody: wrongAmountBody,
      signature: wrongAmountSig,
    });
    assert.equal(wrongAmountResult.ignored, true);
    assert.match(wrongAmountResult.reason, /amount mismatch/);

    // Non-INR currency: must NOT mark SUCCESS or dispatch
    const wrongCurrBody = JSON.stringify({
      ...webhookBodyObj,
      payload: {
        payment: {
          entity: {
            ...webhookBodyObj.payload.payment.entity,
            id: `pay_hook_${uniqueId}_wrong_curr`,
            currency: "USD",
          },
        },
      },
    });
    const wrongCurrSig = generateWebhookSignature(wrongCurrBody);
    const wrongCurrResult = await paymentService.handleRazorpayWebhook({
      rawBody: wrongCurrBody,
      signature: wrongCurrSig,
    });
    assert.equal(wrongCurrResult.ignored, true);
    assert.match(wrongCurrResult.reason, /currency mismatch/);

    // Verify ride is still PAYMENT_PENDING after bad webhooks
    const rideStillPendingAfterBadHooks = await rideRepository.getRideById(cardRide.id);
    assert.equal(rideStillPendingAfterBadHooks.status, "PAYMENT_PENDING");

    // Valid signature succeeds
    const validWebhookSig = generateWebhookSignature(rawWebhookBody);
    const webhookResult = await paymentService.handleRazorpayWebhook({
      rawBody: rawWebhookBody,
      signature: validWebhookSig,
    });

    assert.equal(webhookResult.received, true);
    assert.equal(webhookResult.success, true);

    // Verify ride is now REQUESTED in database
    const activatedRide = await rideRepository.getRideById(cardRide.id);
    assert.equal(activatedRide.status, "REQUESTED");
    assert.equal(activatedRide.payment.status, "SUCCESS");
    assert.equal(activatedRide.payment.transactionId, webhookPaymentId);

    // Duplicate webhook: idempotent
    const duplicateWebhook = await paymentService.handleRazorpayWebhook({
      rawBody: rawWebhookBody,
      signature: validWebhookSig,
    });
    assert.equal(duplicateWebhook.received, true);
    assert.equal(duplicateWebhook.alreadyProcessed, true);

    // Clean up
    await rideService.cancelRide(cardRide.id, riderUser.id);
  });

  test("8. Cancellation of PAYMENT_PENDING ride: Marks payment FAILED and never dispatches", async () => {
    const cancelTestRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Saket Metro Station",
      destination: "Hauz Khas Village",
      pickupLatitude: 28.5208,
      pickupLongitude: 77.2014,
      destinationLatitude: 28.5494,
      destinationLongitude: 77.1942,
      vehicleType: "CAR",
      paymentMethod: "UPI",
    });

    assert.equal(cancelTestRide.status, "PAYMENT_PENDING");

    const cancelled = await rideService.cancelRide(cancelTestRide.id, riderUser.id);
    assert.equal(cancelled.status, "CANCELLED");

    const paymentAfterCancel = await prisma.payment.findUnique({
      where: { rideId: cancelTestRide.id },
    });
    assert.equal(paymentAfterCancel.status, "FAILED");

    // Available rides for driver: still empty
    const available = await rideService.getAvailableRides(driverProfile.id);
    const found = available.find((r) => r.id === cancelTestRide.id);
    assert.equal(found, undefined, "Cancelled pending ride must never appear for drivers");

    // Late verification attempt on CANCELLED ride must be rejected with ConflictError and NEVER transition to REQUESTED
    const latePayId = `pay_${uniqueId}_late_cancel`;
    const lateSig = generatePaymentSignature(cancelTestRide.payment.orderId, latePayId);

    await assert.rejects(
      async () => {
        await paymentService.verifyOnlinePayment({
          rideId: cancelTestRide.id,
          razorpayOrderId: cancelTestRide.payment.orderId,
          razorpayPaymentId: latePayId,
          razorpaySignature: lateSig,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /Cannot verify payment for ride in status 'CANCELLED'/);
        return true;
      }
    );

    // Assert ride and payment status remain strictly CANCELLED / FAILED
    const rideAfterLateVerify = await rideRepository.getRideById(cancelTestRide.id);
    assert.equal(rideAfterLateVerify.status, "CANCELLED", "Cancelled ride must remain CANCELLED");
    const paymentAfterLateVerify = await prisma.payment.findUnique({
      where: { rideId: cancelTestRide.id },
    });
    assert.equal(paymentAfterLateVerify.status, "FAILED", "Payment must remain FAILED");

    // Missing saved orderId rejection: even if payment exists, null orderId must be rejected
    await prisma.payment.update({
      where: { rideId: cancelTestRide.id },
      data: { orderId: null },
    });

    await assert.rejects(
      async () => {
        await paymentService.verifyOnlinePayment({
          rideId: cancelTestRide.id,
          razorpayOrderId: "order_any_mock_id",
          razorpayPaymentId: latePayId,
          razorpaySignature: lateSig,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Razorpay order ID does not match the payment order/);
        return true;
      }
    );
  });

  test("9. Retry Order Initiation: Idempotently generates order without duplicate payment records", async () => {
    const retryRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Nehru Place Delhi",
      destination: "Lajpat Nagar Delhi",
      pickupLatitude: 28.5492,
      pickupLongitude: 77.2529,
      destinationLatitude: 28.5700,
      destinationLongitude: 77.2400,
      vehicleType: "CAR",
      paymentMethod: "CARD",
    });

    assert.equal(retryRide.status, "PAYMENT_PENDING");

    // Initiate retry order
    const retryResult = await paymentService.initiatePaymentOrder({
      rideId: retryRide.id,
      userId: riderUser.id,
    });

    assert.ok(retryResult.orderId);
    assert.equal(retryResult.rideId, retryRide.id);

    // Ensure only 1 payment record exists in the database for this ride
    const paymentsForRide = await prisma.payment.findMany({
      where: { rideId: retryRide.id },
    });
    assert.equal(paymentsForRide.length, 1, "Must never create duplicate payment records for the same ride");

    await rideService.cancelRide(retryRide.id, riderUser.id);
  });

  test("10. Scheduled Ride Payment Flow: Remains inactive until verified", async () => {
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour ahead
    const scheduledRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Dwarka Sector 21",
      destination: "Janakpuri West",
      pickupLatitude: 28.5521,
      pickupLongitude: 77.0583,
      destinationLatitude: 28.6295,
      destinationLongitude: 77.0779,
      vehicleType: "CAR",
      paymentMethod: "UPI",
      isScheduled: true,
      scheduledFor: futureTime,
    });

    assert.equal(scheduledRide.status, "PAYMENT_PENDING");
    assert.equal(scheduledRide.isScheduled, true);

    // Scheduled ride sweep must NOT find or activate PAYMENT_PENDING scheduled ride
    const dueRides = await rideRepository.findDueScheduledRides(120);
    const foundDue = dueRides.find((r) => r.id === scheduledRide.id);
    assert.equal(foundDue, undefined, "Unpaid scheduled ride must NOT be returned in due sweeps");

    await rideService.cancelRide(scheduledRide.id, riderUser.id);
  });

  test("11. Concurrency: Concurrent cancelRide vs verifyOnlinePayment race", async () => {
    const raceRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Kashmere Gate Delhi",
      destination: "Chandni Chowk Delhi",
      pickupLatitude: 28.6675,
      pickupLongitude: 77.2285,
      destinationLatitude: 28.6562,
      destinationLongitude: 77.2304,
      vehicleType: "CAR",
      paymentMethod: "UPI",
    });

    assert.equal(raceRide.status, "PAYMENT_PENDING");

    const validPayId = `pay_${uniqueId}_race_cancel`;
    const validSig = generatePaymentSignature(raceRide.payment.orderId, validPayId);

    // Launch cancelRide and verifyOnlinePayment concurrently
    const [cancelResult, verifyResult] = await Promise.allSettled([
      rideService.cancelRide(raceRide.id, riderUser.id),
      paymentService.verifyOnlinePayment({
        rideId: raceRide.id,
        razorpayOrderId: raceRide.payment.orderId,
        razorpayPaymentId: validPayId,
        razorpaySignature: validSig,
        userId: riderUser.id,
      }),
    ]);

    // Inspect final state in DB
    const finalRide = await prisma.ride.findUnique({
      where: { id: raceRide.id },
      include: { payment: true },
    });

    // In both cases, the ride must NEVER be in REQUESTED unless payment is SUCCESS.
    // If cancelRide won first, verifyOnlinePayment must have rejected with ConflictError
    if (cancelResult.status === "fulfilled" && verifyResult.status === "rejected") {
      assert.ok(verifyResult.reason instanceof ConflictError);
      assert.equal(finalRide.status, "CANCELLED");
      assert.equal(finalRide.payment.status, "FAILED");
    } else if (verifyResult.status === "fulfilled") {
      // If verify won first, payment is SUCCESS, and cancelRide either cancelled the REQUESTED ride or was rejected
      assert.equal(finalRide.payment.status, "SUCCESS");
      // Ride must not be resurrected if cancelled
      if (cancelResult.status === "fulfilled") {
        assert.equal(finalRide.status, "CANCELLED");
      } else {
        assert.equal(finalRide.status, "REQUESTED");
      }
    }

    // Driver visibility check: an unpaid ride or cancelled ride must NEVER be driver-visible
    const available = await rideService.getAvailableRides(driverProfile.id);
    const found = available.find((r) => r.id === raceRide.id);
    if (finalRide.status === "CANCELLED" || finalRide.payment.status !== "SUCCESS") {
      assert.equal(found, undefined, "Unpaid or cancelled ride must never become driver-visible");
    }

    // Clean up if not already cancelled
    if (finalRide.status !== "CANCELLED") {
      await rideService.cancelRide(raceRide.id, riderUser.id);
    }
  });

  test("12. Atomicity & Rollback: Force failure after conditional ride update before transaction completion", async () => {
    // Create a coupon to ensure coupon increment branch is invoked in transaction
    const testCoupon = await prisma.coupon.create({
      data: {
        code: `DISC_${uniqueId}`,
        type: "FLAT",
        discountValue: 10,
        validFrom: new Date(Date.now() - 10000),
        validUntil: new Date(Date.now() + 86400000),
        createdById: riderUser.id,
      },
    });

    const rollbackRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Rajiv Chowk Delhi",
      destination: "Barakhamba Road Delhi",
      pickupLatitude: 28.6328,
      pickupLongitude: 77.2197,
      destinationLatitude: 28.6310,
      destinationLongitude: 77.2270,
      vehicleType: "CAR",
      paymentMethod: "UPI",
      couponCode: testCoupon.code,
    });

    assert.equal(rollbackRide.status, "PAYMENT_PENDING");
    assert.ok(rollbackRide.couponId);

    // Spy on notifications
    let dispatchCallCount = 0;
    const originalDispatch = notificationService.dispatchNotification;
    notificationService.dispatchNotification = async (...args) => {
      dispatchCallCount++;
      return originalDispatch.apply(this, args);
    };

    // Monkey-patch couponRepository.incrementCouponUsageTx to force failure inside transaction
    // after ride.updateMany and payment.update have executed
    const originalIncrement = couponRepository.incrementCouponUsageTx;
    couponRepository.incrementCouponUsageTx = async () => {
      throw new Error("SIMULATED_POST_RIDE_UPDATE_FAILURE");
    };

    const validPayId = `pay_${uniqueId}_rollback_test`;
    const validSig = generatePaymentSignature(rollbackRide.payment.orderId, validPayId);

    try {
      await assert.rejects(
        async () => {
          await paymentService.verifyOnlinePayment({
            rideId: rollbackRide.id,
            razorpayOrderId: rollbackRide.payment.orderId,
            razorpayPaymentId: validPayId,
            razorpaySignature: validSig,
            userId: riderUser.id,
          });
        },
        (err) => {
          assert.equal(err.message, "SIMULATED_POST_RIDE_UPDATE_FAILURE");
          return true;
        }
      );
    } finally {
      // Restore monkey patches
      couponRepository.incrementCouponUsageTx = originalIncrement;
      notificationService.dispatchNotification = originalDispatch;
    }

    // Verify transaction rolled back BOTH ride and payment changes
    const dbRide = await prisma.ride.findUnique({ where: { id: rollbackRide.id } });
    const dbPayment = await prisma.payment.findUnique({ where: { rideId: rollbackRide.id } });

    assert.equal(dbRide.status, "PAYMENT_PENDING", "Ride status must be rolled back to PAYMENT_PENDING");
    assert.equal(dbPayment.status, "PENDING", "Payment status must be rolled back to PENDING");
    assert.equal(dbPayment.transactionId, null, "Payment transactionId must be rolled back to null");

    // Verify no notifications or queue side-effects were dispatched
    assert.equal(dispatchCallCount, 0, "No notifications should be dispatched when transaction rolls back");

    // Clean up ride
    await rideService.cancelRide(rollbackRide.id, riderUser.id);
  });

  test("13. Concurrency: Concurrent duplicate successful verification executes exactly one state transition & dispatch", async () => {
    const dupRide = await rideService.createRide({
      userId: riderUser.id,
      pickup: "Hauz Khas Village Delhi",
      destination: "Green Park Delhi",
      pickupLatitude: 28.5494,
      pickupLongitude: 77.1942,
      destinationLatitude: 28.5584,
      destinationLongitude: 77.2075,
      vehicleType: "CAR",
      paymentMethod: "UPI",
    });

    assert.equal(dupRide.status, "PAYMENT_PENDING");

    const validDupPayId = `pay_${uniqueId}_dup_race`;
    const validDupSig = generatePaymentSignature(dupRide.payment.orderId, validDupPayId);

    // Spy on notifications
    let dispatchCallCount = 0;
    const originalDispatch = notificationService.dispatchNotification;
    notificationService.dispatchNotification = async (...args) => {
      dispatchCallCount++;
      return originalDispatch.apply(this, args);
    };

    let results;
    try {
      // Fire two verification requests concurrently for the exact same ride and payment
      results = await Promise.all([
        paymentService.verifyOnlinePayment({
          rideId: dupRide.id,
          razorpayOrderId: dupRide.payment.orderId,
          razorpayPaymentId: validDupPayId,
          razorpaySignature: validDupSig,
          userId: riderUser.id,
        }),
        paymentService.verifyOnlinePayment({
          rideId: dupRide.id,
          razorpayOrderId: dupRide.payment.orderId,
          razorpayPaymentId: validDupPayId,
          razorpaySignature: validDupSig,
          userId: riderUser.id,
        }),
      ]);
    } finally {
      notificationService.dispatchNotification = originalDispatch;
    }

    // Both calls should return success
    assert.equal(results[0].success, true);
    assert.equal(results[1].success, true);

    // Exactly one must have performed the initial transition and the other flagged alreadyVerified
    const alreadyVerifiedCount = results.filter((r) => r.alreadyVerified === true).length;
    assert.equal(alreadyVerifiedCount, 1, "Exactly one concurrent verification must be marked alreadyVerified");

    // Exactly one dispatch sequence occurred (1 payment success + 1 ride booked = 2 total dispatches)
    // If both executed side effects, count would be 4
    assert.equal(dispatchCallCount, 2, "Side-effect notifications must be dispatched exactly once");

    // Verify DB integrity
    const finalRide = await prisma.ride.findUnique({
      where: { id: dupRide.id },
      include: { payment: true },
    });
    assert.equal(finalRide.status, "REQUESTED");
    assert.equal(finalRide.payment.status, "SUCCESS");
    assert.equal(finalRide.payment.transactionId, validDupPayId);

    // Clean up
    await rideService.cancelRide(dupRide.id, riderUser.id);
  });
});
