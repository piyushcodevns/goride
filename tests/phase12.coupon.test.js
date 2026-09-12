process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const couponService = require("../src/services/coupon.service");
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
} = require("../src/utils/AppError");

describe("PHASE 12: Coupon Management, Validation & Redemption Rules", () => {
  const uniqueId = Date.now();
  let adminUser, riderUser, otherUser;
  let flatCoupon, percentCoupon, cappedCoupon, singleUseCoupon;

  test("Setup admin and user test fixtures", async () => {
    adminUser = await prisma.user.create({
      data: {
        fullName: "Coupon Admin",
        email: `coupon_admin_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "ADMIN",
      },
    });

    riderUser = await prisma.user.create({
      data: {
        fullName: "Coupon Rider",
        email: `coupon_rider_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        fullName: "Other Rider",
        email: `coupon_other_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    assert.ok(adminUser.id);
    assert.ok(riderUser.id);
    assert.ok(otherUser.id);
  });

  test("Coupon Creation Validation: Rejects validUntil <= validFrom", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 3600 * 1000);

    await assert.rejects(
      async () => {
        await couponService.createCoupon(adminUser.id, {
          code: `BAD_DATE_${uniqueId}`,
          type: "FLAT",
          discountValue: 50,
          minimumRideFare: 100,
          validFrom: now,
          validUntil: past,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("validUntil must be greater than validFrom"));
        return true;
      },
    );
  });

  test("Coupon Creation: Successfully creates FLAT and PERCENTAGE coupons with audit logs", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 86400 * 1000);

    flatCoupon = await couponService.createCoupon(adminUser.id, {
      code: `FLAT50_${uniqueId}`,
      description: "Flat 50 discount",
      type: "FLAT",
      discountValue: 50,
      minimumRideFare: 150,
      validFrom: now,
      validUntil: future,
      usageLimit: 100,
      perUserUsageLimit: 1,
    });

    percentCoupon = await couponService.createCoupon(adminUser.id, {
      code: `PERC20_${uniqueId}`,
      description: "20% discount with cap",
      type: "PERCENTAGE",
      discountValue: 20,
      maximumDiscount: 60,
      minimumRideFare: 200,
      validFrom: now,
      validUntil: future,
      usageLimit: 100,
      perUserUsageLimit: 2,
    });

    singleUseCoupon = await couponService.createCoupon(adminUser.id, {
      code: `ONCE10_${uniqueId}`,
      description: "Global single use coupon",
      type: "FLAT",
      discountValue: 10,
      minimumRideFare: 50,
      validFrom: now,
      validUntil: future,
      usageLimit: 1,
      perUserUsageLimit: 1,
    });

    assert.ok(flatCoupon.id);
    assert.ok(percentCoupon.id);
    assert.ok(singleUseCoupon.id);

    // Verify AuditLog for coupon creation
    const audit = await prisma.auditLog.findFirst({
      where: { adminId: adminUser.id, entityId: flatCoupon.id, action: "CREATE" },
    });
    assert.ok(audit, "Coupon creation must write an audit log");
  });

  test("Duplicate Coupon Rejection: Rejects duplicate coupon code", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400 * 1000);

    await assert.rejects(
      async () => {
        await couponService.createCoupon(adminUser.id, {
          code: flatCoupon.code,
          type: "FLAT",
          discountValue: 25,
          minimumRideFare: 100,
          validFrom: now,
          validUntil: future,
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("Coupon code already exists"));
        return true;
      },
    );
  });

  test("Coupon Activation & Deactivation: Inactive coupon cannot be applied", async () => {
    // Deactivate flat coupon
    await couponService.deactivateCoupon(adminUser.id, flatCoupon.id);

    // Create a ride for testing
    const ride = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Point A",
        destination: "Point B",
        distance: 10.0,
        estimatedFare: 200.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: flatCoupon.code,
          rideId: ride.id,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "This coupon is currently inactive.");
        return true;
      },
    );

    // Reactivate coupon for subsequent tests
    await couponService.activateCoupon(adminUser.id, flatCoupon.id);
  });

  test("Minimum Fare Rule: Rejects coupon if ride fare < minimumRideFare", async () => {
    const cheapRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Short Trip A",
        destination: "Short Trip B",
        distance: 2.0,
        estimatedFare: 100.0, // Minimum for flatCoupon is 150
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: flatCoupon.code,
          rideId: cheapRide.id,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Minimum ride fare should be"));
        return true;
      },
    );
  });

  test("Ride State & Ownership: Coupon cannot be applied to other's ride or non-REQUESTED ride", async () => {
    // 1. Non-owner
    const ride1 = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Trip X",
        destination: "Trip Y",
        distance: 10.0,
        estimatedFare: 300.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: percentCoupon.code,
          rideId: ride1.id,
          userId: otherUser.id, // non-owner
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("not allowed to apply a coupon"));
        return true;
      },
    );

    // 2. Non-REQUESTED ride (e.g. ACCEPTED)
    await prisma.ride.update({
      where: { id: ride1.id },
      data: { status: "ACCEPTED" },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: percentCoupon.code,
          rideId: ride1.id,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("only be applied before the ride is accepted"));
        return true;
      },
    );
  });

  test("Apply Coupon: Calculates discount correctly and increments usage counters atomically", async () => {
    const ride = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Discount Trip Start",
        destination: "Discount Trip End",
        distance: 10.0,
        estimatedFare: 200.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const applied = await couponService.applyCoupon({
      code: flatCoupon.code,
      rideId: ride.id,
      userId: riderUser.id,
    });

    assert.equal(applied.discountAmount, 50.0);
    assert.equal(applied.finalFare, 150.0);

    // Verify ride record in DB
    const updatedRide = await prisma.ride.findUnique({ where: { id: ride.id } });
    assert.equal(updatedRide.couponId, flatCoupon.id);
    assert.equal(Number(updatedRide.discountAmount), 50.0);
    assert.equal(Number(updatedRide.finalFare), 150.0);

    // Verify coupon usage in DB
    const usage = await prisma.couponUsage.findFirst({
      where: { couponId: flatCoupon.id, rideId: ride.id },
    });
    assert.ok(usage);
    assert.equal(Number(usage.discountAmount), 50.0);

    // Verify coupon usage counter was incremented
    const freshCoupon = await prisma.coupon.findUnique({ where: { id: flatCoupon.id } });
    assert.equal(freshCoupon.usedCount, 1);
  });

  test("Double Redemption: Cannot apply a coupon to a ride that already has one", async () => {
    // Find the ride that already has flatCoupon applied
    const rideWithCoupon = await prisma.ride.findFirst({
      where: { couponId: flatCoupon.id },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: percentCoupon.code,
          rideId: rideWithCoupon.id,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("already been applied"));
        return true;
      },
    );
  });

  test("Percentage Discount & Max Cap: Caps discount at maximumDiscount limit", async () => {
    // Estimated fare 500, 20% would be 100, but maximumDiscount is 60
    const expensiveRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Long Trip Start",
        destination: "Long Trip End",
        distance: 25.0,
        estimatedFare: 500.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const applied = await couponService.applyCoupon({
      code: percentCoupon.code,
      rideId: expensiveRide.id,
      userId: riderUser.id,
    });

    assert.equal(applied.discountAmount, 60.0, "Discount must be capped at maximumDiscount 60");
    assert.equal(applied.finalFare, 440.0);
  });

  test("Per-User Usage Limit: Rejects coupon when user reaches perUserUsageLimit", async () => {
    // flatCoupon has perUserUsageLimit: 1, and riderUser has already used it once
    const newRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Third Trip Start",
        destination: "Third Trip End",
        distance: 10.0,
        estimatedFare: 200.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: flatCoupon.code,
          rideId: newRide.id,
          userId: riderUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("reached the usage limit"));
        return true;
      },
    );
  });

  test("Global Usage Limit: Rejects coupon when overall usageLimit is reached", async () => {
    // singleUseCoupon has usageLimit: 1
    const rideUser1 = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Global Test Trip 1",
        destination: "Global Test Dest 1",
        distance: 5.0,
        estimatedFare: 100.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    // 1. First user consumes the only available global slot
    await couponService.applyCoupon({
      code: singleUseCoupon.code,
      rideId: rideUser1.id,
      userId: riderUser.id,
    });

    // 2. Second user attempts to redeem the same coupon
    const rideUser2 = await prisma.ride.create({
      data: {
        userId: otherUser.id,
        pickup: "Global Test Trip 2",
        destination: "Global Test Dest 2",
        distance: 5.0,
        estimatedFare: 100.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    await assert.rejects(
      async () => {
        await couponService.applyCoupon({
          code: singleUseCoupon.code,
          rideId: rideUser2.id,
          userId: otherUser.id,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("usage limit has been reached"));
        return true;
      },
    );
  });
});
