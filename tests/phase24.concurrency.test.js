process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const paymentService = require("../src/services/payment.service");
const adminPaymentService = require("../src/services/admin/adminPayment.service");
const { ConflictError, BadRequestError } = require("../src/utils/AppError");

describe("PHASE 24: Concurrency, Race Conditions & Atomic Locks", () => {
  let rider;
  let admin;
  let drivers = [];

  before(async () => {
    // Fixtures
    rider = await prisma.user.create({
      data: {
        fullName: "Concurrent Rider",
        email: `concurrent_rider_${Date.now()}@goride.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "HashedPassword123!",
        role: "USER",
      },
    });

    admin = await prisma.user.create({
      data: {
        fullName: "Concurrent Admin",
        email: `concurrent_admin_${Date.now()}@goride.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "HashedPassword123!",
        role: "SUPER_ADMIN",
      },
    });

    for (let i = 0; i < 3; i++) {
      const u = await prisma.user.create({
        data: {
          fullName: `Concurrent Driver ${i}`,
          email: `concurrent_driver_${i}_${Date.now()}@goride.com`,
          phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
          password: "HashedPassword123!",
          role: "DRIVER",
        },
      });

      const d = await prisma.driver.create({
        data: {
          userId: u.id,
          licenseNumber: `CONC_LIC_${i}_${Date.now()}`,
          aadharNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          status: "APPROVED",
          availability: "AVAILABLE",
          experience: 3,
        },
      });

      await prisma.vehicle.create({
        data: {
          driverId: d.id,
          vehicleType: "CAR",
          category: "ECONOMY",
          brand: "Maruti",
          model: "Swift",
          color: "White",
          vehicleNumber: `CONC_VEH_${i}_${Date.now()}`,
          seats: 4,
          status: "APPROVED",
        },
      });

      drivers.push(d);
    }
  });

  after(async () => {
    if (rider) {
      await prisma.ride.deleteMany({ where: { userId: rider.id } });
      await prisma.user.delete({ where: { id: rider.id } }).catch(() => {});
    }
    if (admin) {
      await prisma.user.delete({ where: { id: admin.id } }).catch(() => {});
    }
    for (const d of drivers) {
      await prisma.vehicle.deleteMany({ where: { driverId: d.id } });
      await prisma.driver.delete({ where: { id: d.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: d.userId } }).catch(() => {});
    }
  });

  test("Concurrent Driver Assignment: Atomic lock ensures exactly one driver wins acceptance", async () => {
    const ride = await prisma.ride.create({
      data: {
        userId: rider.id,
        pickup: "Point X",
        destination: "Point Y",
        distance: 8.5,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const results = await Promise.allSettled(
      drivers.map((d) => rideService.assignDriver(ride.id, d.id))
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 2);

    const updatedRide = await prisma.ride.findUnique({ where: { id: ride.id } });
    assert.equal(updatedRide.status, "ACCEPTED");
    assert.ok(drivers.some((d) => d.id === updatedRide.driverId));
  });

  test("Concurrent Payment Processing: Idempotent lock prevents double success", async () => {
    const payRide = await prisma.ride.create({
      data: {
        userId: rider.id,
        pickup: "Point A",
        destination: "Point B",
        distance: 5.0,
        vehicleType: "CAR",
        status: "COMPLETED",
        finalFare: 250.0,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        rideId: payRide.id,
        userId: rider.id,
        amount: 250.0,
        paymentMethod: "UPI",
        status: "PENDING",
      },
    });

    const results = await Promise.allSettled([
      paymentService.updatePaymentStatus(payment.id, "PROCESSING"),
      paymentService.updatePaymentStatus(payment.id, "PROCESSING"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    assert.ok(fulfilled.length >= 1);

    const dbPay = await prisma.payment.findUnique({ where: { id: payment.id } });
    assert.equal(dbPay.status, "PROCESSING");
  });

  test("Concurrent Double Refund: Simultaneous refund attempts reject duplicate credits", async () => {
    const refundRide = await prisma.ride.create({
      data: {
        userId: rider.id,
        pickup: "Point M",
        destination: "Point N",
        distance: 4.0,
        vehicleType: "CAR",
        status: "COMPLETED",
        finalFare: 180.0,
      },
    });

    const successPayment = await prisma.payment.create({
      data: {
        rideId: refundRide.id,
        userId: rider.id,
        amount: 180.0,
        paymentMethod: "CARD",
        status: "SUCCESS",
        transactionId: `txn_conc_ref_${Date.now()}`,
        paidAt: new Date(),
      },
    });

    const results = await Promise.allSettled([
      adminPaymentService.refundPayment({
        paymentId: successPayment.id,
        adminId: admin.id,
        ipAddress: "127.0.0.1",
        userAgent: "TestAgent",
      }),
      adminPaymentService.refundPayment({
        paymentId: successPayment.id,
        adminId: admin.id,
        ipAddress: "127.0.0.1",
        userAgent: "TestAgent",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const dbPay = await prisma.payment.findUnique({ where: { id: successPayment.id } });
    assert.equal(dbPay.status, "REFUNDED");
  });

  test("Concurrent Ride Cancellation: Double cancellation rejects redundant request", async () => {
    const cancelRideFixture = await prisma.ride.create({
      data: {
        userId: rider.id,
        pickup: "Pickup Point",
        destination: "Dropoff Point",
        distance: 3.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const results = await Promise.allSettled([
      rideService.cancelRide(cancelRideFixture.id, rider.id),
      rideService.cancelRide(cancelRideFixture.id, rider.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const finalRide = await prisma.ride.findUnique({ where: { id: cancelRideFixture.id } });
    assert.equal(finalRide.status, "CANCELLED");
  });
});
