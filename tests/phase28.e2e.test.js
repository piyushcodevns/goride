process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";
process.env.JWT_SECRET = "test_jwt_secret_at_least_32_characters_long_for_security_tests";
process.env.JWT_ISSUER = "goride";
process.env.JWT_AUDIENCE = "goride-api";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/config/prisma");
const authService = require("../src/services/auth.service");
const rideService = require("../src/services/ride.service");
const paymentService = require("../src/services/payment.service");
const PricingEngine = require("../src/services/pricing.engine");

describe("PHASE 28: Complete End-to-End Ride Lifecycle & Edge Flows", () => {
  let riderUser;
  let driverUser;
  let driverProfile;
  let vehicle;
  let adminUser;

  before(async () => {
    // 1. Setup Admin
    adminUser = await prisma.user.create({
      data: {
        fullName: "E2E Admin",
        email: `e2e_admin_${Date.now()}@goride.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "HashedPassword123!",
        role: "SUPER_ADMIN",
      },
    });

    // 2. Setup Driver
    driverUser = await prisma.user.create({
      data: {
        fullName: "E2E Driver",
        email: `e2e_driver_${Date.now()}@goride.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "HashedPassword123!",
        role: "DRIVER",
      },
    });

    driverProfile = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: `E2E_LIC_${Date.now()}`,
        aadharNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        status: "APPROVED",
        availability: "AVAILABLE",
        experience: 5,
      },
    });

    vehicle = await prisma.vehicle.create({
      data: {
        driverId: driverProfile.id,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Tata",
        model: "Tigor",
        color: "Silver",
        vehicleNumber: `E2E_VEH_${Date.now()}`,
        seats: 4,
        status: "APPROVED",
      },
    });
  });

  after(async () => {
    if (riderUser) {
      await prisma.rideReview.deleteMany({ where: { userId: riderUser.id } });
      await prisma.payment.deleteMany({ where: { userId: riderUser.id } });
      await prisma.ride.deleteMany({ where: { userId: riderUser.id } });
      await prisma.user.delete({ where: { id: riderUser.id } }).catch(() => {});
    }
    if (vehicle) {
      await prisma.vehicle.delete({ where: { id: vehicle.id } }).catch(() => {});
    }
    if (driverProfile) {
      await prisma.driver.delete({ where: { id: driverProfile.id } }).catch(() => {});
    }
    if (driverUser) {
      await prisma.user.delete({ where: { id: driverUser.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    const pendingService = require("../src/services/pendingRegistration.service");
    await pendingService.closePendingRegistrationClient();
    await prisma.$disconnect();
  });

  test("End-to-End Success Flow: Signup -> Login -> Create -> Accept -> Arrive -> Start -> Complete -> Pay -> Review", async () => {
    // Stage 1: Rider Signup
    let capturedOtp = null;
    const emailService = require("../src/services/email.service");
    emailService.sendEmail.testInterceptor = async ({ html }) => {
      const m = html?.match(/<h1>(\d{6})<\/h1>/);
      if (m) capturedOtp = m[1];
      return { messageId: "test-mock-msg-id" };
    };

    const uniqueEmail = `e2e_rider_${Date.now()}@goride.com`;
    const signupData = {
      fullName: "E2E Test Rider",
      email: uniqueEmail,
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      password: "StrongPassword123!",
    };
    const registerRes = await authService.registerUser(signupData);
    assert.equal(registerRes.requiresVerification, true);

    // Verify user email to create user in DB
    const verifyRes = await authService.verifyEmail(capturedOtp, uniqueEmail);
    riderUser = verifyRes.user;
    assert.ok(riderUser.id);

    // Stage 2: Rider Login
    const loginRes = await authService.loginUser({
      email: uniqueEmail,
      password: "StrongPassword123!",
    });
    assert.ok(loginRes.token);

    // Stage 3: Fare Calculation & Ride Creation
    const baseFare = 50.0;
    const distanceFare = PricingEngine.calculateDistanceFare(7.0, { pricePerKm: 12 });
    const durationFare = PricingEngine.calculateDurationFare(20, { pricePerMinute: 2 });
    const subtotal = baseFare + distanceFare + durationFare;
    const gst = PricingEngine.calculateGST(subtotal, { gstPercentage: 5 });
    const finalFare = subtotal + gst;

    const ride = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Varanasi Cantt Station",
        destination: "Dashashwamedh Ghat",
        pickupLatitude: 25.3283,
        pickupLongitude: 82.9866,
        destinationLatitude: 25.3076,
        destinationLongitude: 83.0107,
        distance: 7.0,
        duration: 20.0,
        vehicleType: "CAR",
        status: "REQUESTED",
        baseFare,
        distanceFare,
        durationFare,
        gstAmount: gst,
        finalFare,
      },
    });
    assert.equal(ride.status, "REQUESTED");

    // Stage 4: Driver Match & Accept
    const assignedRide = await rideService.assignDriver(ride.id, driverProfile.id);
    assert.equal(assignedRide.status, "ACCEPTED");
    assert.equal(assignedRide.driverId, driverProfile.id);

    // Stage 5: Driver Arrives
    const arrivedRide = await rideService.updateRideStatus(ride.id, driverProfile.id, "ARRIVED");
    assert.equal(arrivedRide.status, "ARRIVED");

    // Stage 6: Ride Starts
    const startedRide = await rideService.updateRideStatus(ride.id, driverProfile.id, "STARTED");
    assert.equal(startedRide.status, "STARTED");

    // Stage 7: Ride Completes
    const completedRide = await rideService.updateRideStatus(ride.id, driverProfile.id, "COMPLETED");
    assert.equal(completedRide.status, "COMPLETED");

    // Stage 8: Payment Creation & Completion
    const payment = await paymentService.createPayment({
      rideId: ride.id,
      userId: riderUser.id,
      paymentMethod: "UPI",
    });
    assert.equal(payment.status, "PENDING");
    assert.equal(Number(payment.amount), Number(finalFare));

    await paymentService.updatePaymentStatus(payment.id, "PROCESSING");
    const paidPayment = await paymentService.updatePaymentStatus(
      payment.id,
      "SUCCESS",
      `txn_e2e_${Date.now()}`
    );
    assert.equal(paidPayment.status, "SUCCESS");

    // Stage 9: Rider Review
    const review = await prisma.rideReview.create({
      data: {
        rideId: ride.id,
        userId: riderUser.id,
        driverId: driverProfile.id,
        rating: 5,
        review: "Excellent and smooth ride!",
      },
    });
    assert.equal(review.rating, 5);

    // Stage 10: Verification of History
    const userPayments = await paymentService.getMyPayments(riderUser.id);
    assert.ok(userPayments.some((p) => p.id === payment.id && p.status === "SUCCESS"));
  });

  test("Negative Edge Flow 1: Ride Cancellation by Rider", async () => {
    assert.ok(riderUser, "Rider user must exist from previous step");

    const cancelRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Point C",
        destination: "Point D",
        distance: 4.5,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const result = await rideService.cancelRide(cancelRide.id, riderUser.id);
    assert.equal(result.status, "CANCELLED");

    const dbRide = await prisma.ride.findUnique({ where: { id: cancelRide.id } });
    assert.equal(dbRide.status, "CANCELLED");
  });

  test("Negative Edge Flow 2: Driver Ride Rejection", async () => {
    assert.ok(riderUser, "Rider user must exist from previous step");

    const rejectRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Point E",
        destination: "Point F",
        distance: 3.2,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    const rejectRes = await rideService.rejectRide(rejectRide.id, driverProfile.id);
    assert.ok(rejectRes.message.includes("rejected successfully"));

    const rejectAudit = await prisma.rideReject.findFirst({
      where: { rideId: rejectRide.id, driverId: driverProfile.id },
    });
    assert.ok(rejectAudit);
  });
});
