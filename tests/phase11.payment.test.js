process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const paymentService = require("../src/services/payment.service");
const adminPaymentService = require("../src/services/admin/adminPayment.service");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../src/utils/AppError");

describe("PHASE 11: Payment State Machine, Idempotency & Refund Auditing", () => {
  const uniqueId = Date.now();
  let riderUser, otherUser, adminUser;
  let completedRide, activeRide;
  let testPayment;

  test("Setup test users, completed ride, and active ride", async () => {
    riderUser = await prisma.user.create({
      data: {
        fullName: "Payment Rider",
        email: `pay_rider_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        fullName: "Other Rider",
        email: `pay_other_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    adminUser = await prisma.user.create({
      data: {
        fullName: "Payment Admin",
        email: `pay_admin_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "ADMIN",
      },
    });

    // Completed ride with final fare
    completedRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Pay Start Point",
        destination: "Pay End Point",
        distance: 12.5,
        finalFare: 350.0,
        vehicleType: "CAR",
        status: "COMPLETED",
      },
    });

    // Active (non-completed) ride
    activeRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Active Start Point",
        destination: "Active End Point",
        distance: 8.0,
        vehicleType: "CAR",
        status: "ACCEPTED",
      },
    });

    assert.ok(completedRide.id);
    assert.ok(activeRide.id);
  });

  test("Create Payment Precondition: Rejects payment for non-completed ride", async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId: activeRide.id,
          userId: riderUser.id,
          paymentMethod: "CARD",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("only be created after ride completion"));
        return true;
      },
    );
  });

  test("Create Payment Ownership: Rejects non-owner from creating payment for another's ride", async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId: completedRide.id,
          userId: otherUser.id,
          paymentMethod: "CARD",
        });
      },
      (err) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.message, "Unauthorized payment request.");
        return true;
      },
    );
  });

  test("Create Payment: Initializes with PENDING status and exact authoritative finalFare", async () => {
    testPayment = await paymentService.createPayment({
      rideId: completedRide.id,
      userId: riderUser.id,
      paymentMethod: "UPI",
    });

    assert.ok(testPayment.id);
    assert.equal(testPayment.status, "PENDING");
    assert.equal(Number(testPayment.amount), Number(completedRide.finalFare));
    assert.equal(testPayment.userId, riderUser.id);
    assert.equal(testPayment.rideId, completedRide.id);
  });

  test("Duplicate Payment Prevention: Cannot create a second payment for the same ride", async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId: completedRide.id,
          userId: riderUser.id,
          paymentMethod: "CASH",
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "Payment already exists for this ride.");
        return true;
      },
    );
  });

  test("State Machine: Invalid transition PENDING -> SUCCESS rejected without PROCESSING", async () => {
    await assert.rejects(
      async () => {
        await paymentService.updatePaymentStatus(testPayment.id, "SUCCESS", "tx_invalid_jump");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Invalid payment status transition"));
        return true;
      },
    );
  });

  test("State Machine: PENDING -> PROCESSING transition succeeds", async () => {
    const processingPayment = await paymentService.updatePaymentStatus(
      testPayment.id,
      "PROCESSING",
    );
    assert.equal(processingPayment.status, "PROCESSING");
  });

  test("State Machine: PROCESSING -> SUCCESS requires non-empty transactionId", async () => {
    await assert.rejects(
      async () => {
        await paymentService.updatePaymentStatus(testPayment.id, "SUCCESS", "");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Transaction ID is required"));
        return true;
      },
    );
  });

  test("State Machine: PROCESSING -> SUCCESS succeeds with valid transactionId and records paidAt", async () => {
    const successTxId = `txn_${uniqueId}_001`;
    const successPayment = await paymentService.updatePaymentStatus(
      testPayment.id,
      "SUCCESS",
      successTxId,
    );

    assert.equal(successPayment.status, "SUCCESS");
    assert.equal(successPayment.transactionId, successTxId);
    assert.ok(successPayment.paidAt instanceof Date);
  });

  test("Duplicate Transaction ID: Rejects duplicate transaction ID on another payment", async () => {
    // Create another completed ride
    const secondRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Second Pickup",
        destination: "Second Dest",
        distance: 5.0,
        finalFare: 150.0,
        vehicleType: "CAR",
        status: "COMPLETED",
      },
    });

    const secondPayment = await paymentService.createPayment({
      rideId: secondRide.id,
      userId: riderUser.id,
      paymentMethod: "UPI",
    });

    await paymentService.updatePaymentStatus(secondPayment.id, "PROCESSING");

    // Attempt to use same transaction ID as testPayment
    await assert.rejects(
      async () => {
        await paymentService.updatePaymentStatus(
          secondPayment.id,
          "SUCCESS",
          `txn_${uniqueId}_001`,
        );
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "Transaction ID already exists.");
        return true;
      },
    );
  });

  test("Admin Refund: Refunds SUCCESS payment and logs REFUND_PAYMENT audit trail", async () => {
    const refundResult = await adminPaymentService.refundPayment({
      paymentId: testPayment.id,
      adminId: adminUser.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.equal(refundResult.status, "REFUNDED");

    // Verify AuditLog in DB
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        adminId: adminUser.id,
        entityId: testPayment.id,
        action: "UPDATE",
      },
    });
    assert.ok(auditLog, "Refund must create an audit log record");
    assert.equal(auditLog.entity, "PAYMENT");
    assert.equal(auditLog.metadata?.action, "REFUND_PAYMENT");
  });

  test("Double Refund Prevention: Rejects second refund attempt on REFUNDED payment", async () => {
    await assert.rejects(
      async () => {
        await adminPaymentService.refundPayment({
          paymentId: testPayment.id,
          adminId: adminUser.id,
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Only successful payments can be refunded"));
        return true;
      },
    );
  });

  test("Invalid Transition: REFUNDED status cannot be reversed to SUCCESS or PROCESSING", async () => {
    await assert.rejects(
      async () => {
        await paymentService.updatePaymentStatus(testPayment.id, "SUCCESS", "tx_rev");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Invalid payment status transition"));
        return true;
      },
    );
  });

  test("User Payment History & Ownership: Lists user payments; restricts non-owner access", async () => {
    const payments = await paymentService.getMyPayments(riderUser.id);
    assert.ok(Array.isArray(payments));
    assert.ok(payments.length >= 1);
    assert.equal(payments[0].userId, riderUser.id);

    // Other user cannot fetch riderUser's payment by ride
    await assert.rejects(
      async () => {
        await paymentService.getPaymentByRide(completedRide.id, otherUser);
      },
      (err) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.message, "You are not authorized to access this payment.");
        return true;
      },
    );
  });
});
