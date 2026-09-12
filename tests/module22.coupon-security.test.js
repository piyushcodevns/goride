process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const couponService = require("../src/services/coupon.service");
const { NotFoundError, BadRequestError } = require("../src/utils/AppError");

describe("MODULE 22: Coupon Optionality & Server-Side Security Verification", () => {
  const uniqueId = Date.now();
  let testUser, adminUser, flatCoupon;

  test("Setup test fixtures (rider, admin, and active coupon)", async () => {
    testUser = await prisma.user.create({
      data: {
        fullName: "Module22 Rider",
        email: `module22_rider_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    adminUser = await prisma.user.create({
      data: {
        fullName: "Module22 Admin",
        email: `module22_admin_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "ADMIN",
      },
    });

    const now = new Date();
    const future = new Date(now.getTime() + 30 * 86400 * 1000);

    flatCoupon = await couponService.createCoupon(adminUser.id, {
      code: `SECURE50_${uniqueId}`,
      description: "Secure flat 50 discount",
      type: "FLAT",
      discountValue: 50,
      minimumRideFare: 50,
      validFrom: now,
      validUntil: future,
      usageLimit: 50,
      perUserUsageLimit: 5,
    });

    assert.ok(testUser.id);
    assert.ok(adminUser.id);
    assert.ok(flatCoupon.id);
  });

  beforeEach(async () => {
    if (testUser?.id) {
      await prisma.fareAudit.deleteMany({ where: { ride: { userId: testUser.id } } });
      await prisma.couponUsage.deleteMany({ where: { userId: testUser.id } });
      await prisma.ride.deleteMany({ where: { userId: testUser.id } });
    }
  });

  test("Case 1: User WITHOUT coupon books normally (coupon is 100% optional)", async () => {
    const ride = await rideService.createRide({
      userId: testUser.id,
      pickup: "Connaught Place, New Delhi",
      pickupLatitude: 28.6315,
      pickupLongitude: 77.2167,
      destination: "India Gate, New Delhi",
      destinationLatitude: 28.6129,
      destinationLongitude: 77.2295,
      vehicleType: "CAR",
      couponCode: null,
    });

    assert.ok(ride.id);
    assert.equal(ride.couponId, null);
    assert.equal(Number(ride.discountAmount), 0);
    assert.ok(Number(ride.finalFare) > 0);
    assert.ok(Number(ride.estimatedFare) > 0);
  });

  test("Case 2: Malicious client injects discountAmount: 9999 without coupon (Server ignores client discount)", async () => {
    const ride = await rideService.createRide({
      userId: testUser.id,
      pickup: "Connaught Place, New Delhi",
      pickupLatitude: 28.6315,
      pickupLongitude: 77.2167,
      destination: "India Gate, New Delhi",
      destinationLatitude: 28.6129,
      destinationLongitude: 77.2295,
      vehicleType: "CAR",
      discountAmount: 9999, // Injected malicious client discount
      finalFare: 1, // Injected fake final fare
    });

    assert.ok(ride.id);
    assert.equal(ride.couponId, null);
    assert.equal(Number(ride.discountAmount), 0, "Server MUST NOT trust client-supplied discountAmount");
    assert.ok(Number(ride.finalFare) > 50, "Server final fare must be calculated authoritatively");
  });

  test("Case 3: Malicious client injects discountAmount: 9999 with valid coupon (Server calculates authoritative discount)", async () => {
    const ride = await rideService.createRide({
      userId: testUser.id,
      pickup: "Connaught Place, New Delhi",
      pickupLatitude: 28.6315,
      pickupLongitude: 77.2167,
      destination: "India Gate, New Delhi",
      destinationLatitude: 28.6129,
      destinationLongitude: 77.2295,
      vehicleType: "CAR",
      couponCode: flatCoupon.code,
      discountAmount: 9999, // Injected malicious discount
    });

    assert.ok(ride.id);
    assert.equal(ride.couponId, flatCoupon.id);
    assert.equal(Number(ride.discountAmount), 50, "Discount must be exactly ₹50 as defined on server");
    assert.ok(Number(ride.finalFare) > 0);
  });

  test("Case 4: User submits invalid coupon code (Server rejects booking)", async () => {
    await assert.rejects(
      async () => {
        await rideService.createRide({
          userId: testUser.id,
          pickup: "Connaught Place, New Delhi",
          pickupLatitude: 28.6315,
          pickupLongitude: 77.2167,
          destination: "India Gate, New Delhi",
          destinationLatitude: 28.6129,
          destinationLongitude: 77.2295,
          vehicleType: "CAR",
          couponCode: "NON_EXISTENT_COUPON_XYZ",
        });
      },
      (err) => {
        assert.ok(err instanceof NotFoundError || err instanceof BadRequestError);
        return true;
      }
    );
  });

  after(async () => {
    await prisma.couponUsage.deleteMany({ where: { couponId: flatCoupon?.id } });
    await prisma.fareAudit.deleteMany({ where: { ride: { userId: testUser?.id } } });
    await prisma.ride.deleteMany({ where: { userId: testUser?.id } });
    if (flatCoupon?.id) await prisma.coupon.delete({ where: { id: flatCoupon.id } }).catch(() => {});
    if (testUser?.id) await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  });
});
