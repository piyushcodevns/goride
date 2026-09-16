process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const { getRouteDetails } = require("../src/services/openRoute.service");
const MapsCacheService = require("../src/services/maps-cache.service");
const razorpayGateway = require("../src/gateways/razorpay.gateway");
const { ConflictError, UnauthorizedError } = require("../src/utils/AppError");

describe("Active Ride Resolution & Transparent Route ETA", () => {
  let riderUser;
  let otherUser;

  before(async () => {
    razorpayGateway.setRazorpayClient({
      orders: {
        create: async (params) => ({
          id: `order_mock_${Date.now()}`,
          amount: params.amount,
          currency: params.currency || "INR",
          status: "created",
        }),
      },
    });

    function seedRoute(startLat, startLng, endLat, endLng, distance = 4.2, duration = 14.0) {
      MapsCacheService.setRoute(
        Number(startLat).toFixed(6),
        Number(startLng).toFixed(6),
        Number(endLat).toFixed(6),
        Number(endLng).toFixed(6),
        {
          distance,
          duration,
          eta: `${Math.round(duration)} minutes`,
          trafficModel: "STATIC_ROUTE_ESTIMATE",
          isTrafficAware: false,
          isVehicleSpecific: false,
          geometry: "mock_polyline",
        },
      );
    }

    seedRoute(25.328, 82.974, 25.308, 83.010, 4.5, 15.0);
    seedRoute(25.289, 83.006, 25.267, 82.991, 3.2, 12.0);

    const timestamp = Date.now();
    riderUser = await prisma.user.create({
      data: {
        email: `rider_eta_${timestamp}@example.com`,
        phone: `+9198${String(timestamp).slice(-8)}`,
        password: "Password123!",
        fullName: "Test ETA Rider",
        role: "USER",
        emailVerified: true,
        isActive: true,
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: `other_rider_${timestamp}@example.com`,
        phone: `+9197${String(timestamp).slice(-8)}`,
        password: "Password123!",
        fullName: "Other Test Rider",
        role: "USER",
        emailVerified: true,
        isActive: true,
      },
    });
  });

  after(async () => {
    try {
      razorpayGateway.resetRazorpayClient();
      if (riderUser) {
        await prisma.ride.deleteMany({ where: { userId: riderUser.id } });
        await prisma.user.delete({ where: { id: riderUser.id } });
      }
      if (otherUser) {
        await prisma.ride.deleteMany({ where: { userId: otherUser.id } });
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    } catch (_) {}
  });

  describe("Transparent Route ETA (No Fake Multipliers)", () => {
    test("Route Details: Returns authoritative static route duration without fake multipliers", async () => {
      const start = { latitude: 25.3176, longitude: 82.9739 };
      const end = { latitude: 25.3276, longitude: 82.9839 };

      MapsCacheService.setRoute(
        Number(start.latitude).toFixed(6),
        Number(start.longitude).toFixed(6),
        Number(end.latitude).toFixed(6),
        Number(end.longitude).toFixed(6),
        {
          distance: 1.1,
          duration: 11.0,
          eta: "11 minutes",
          trafficModel: "STATIC_ROUTE_ESTIMATE",
          isTrafficAware: false,
          isVehicleSpecific: false,
          geometry: "mock_polyline",
        },
      );

      const route = await getRouteDetails(start, end);
      assert.equal(route.distance, 1.1);
      assert.equal(route.duration, 11.0, "Must return authentic route duration without arbitrary multipliers");
      assert.equal(route.eta, "11 minutes");
      assert.equal(route.trafficModel, "STATIC_ROUTE_ESTIMATE");
      assert.equal(route.isTrafficAware, false);
      assert.equal(route.isVehicleSpecific, false);
    });
  });

  describe("Active Ride State Machine, Cancellation Safety & Authorization", () => {
    let createdRide;

    test("Active ride detection: Returns PAYMENT_PENDING ride and blocks duplicate booking", async () => {
      createdRide = await rideService.createRide({
        userId: riderUser.id,
        pickup: "Varanasi Cantt Station",
        pickupLatitude: 25.328,
        pickupLongitude: 82.974,
        destination: "Dashashwamedh Ghat",
        destinationLatitude: 25.308,
        destinationLongitude: 83.010,
        vehicleType: "BIKE",
        paymentMethod: "UPI",
      });

      assert.ok(createdRide.id);
      assert.equal(createdRide.status, "PAYMENT_PENDING");

      // Active ride lookup finds it
      const activeRide = await rideService.getActiveRideForUser(riderUser.id);
      assert.ok(activeRide);
      assert.equal(activeRide.id, createdRide.id);
      assert.equal(activeRide.status, "PAYMENT_PENDING");

      // Attempting to book second ride must throw ConflictError with activeRide metadata
      await assert.rejects(
        async () => {
          await rideService.createRide({
            userId: riderUser.id,
            pickup: "Assi Ghat",
            pickupLatitude: 25.289,
            pickupLongitude: 83.006,
            destination: "BHU Main Gate",
            destinationLatitude: 25.267,
            destinationLongitude: 82.991,
            vehicleType: "CAR",
            paymentMethod: "CASH",
          });
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          assert.match(err.message, /You already have an active ride/);
          assert.ok(err.data?.activeRide);
          assert.equal(err.data.activeRide.id, createdRide.id);
          assert.equal(err.data.activeRide.status, "PAYMENT_PENDING");
          assert.ok("paymentMethod" in err.data.activeRide);
          assert.ok("paymentStatus" in err.data.activeRide);
          return true;
        },
      );
    });

    test("Cancellation authorization: Non-owner cannot cancel the ride", async () => {
      await assert.rejects(
        async () => {
          await rideService.cancelRide(createdRide.id, otherUser.id);
        },
        (err) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.statusCode, 401);
          return true;
        },
      );
    });

    test("Safe & Idempotent PAYMENT_PENDING cancellation: unblocks booking and rejects double cancel", async () => {
      // First cancellation: succeeds
      const cancelResult = await rideService.cancelRide(createdRide.id, riderUser.id);
      assert.equal(cancelResult.status, "CANCELLED");

      // Verify active ride is now null
      const activeRide = await rideService.getActiveRideForUser(riderUser.id);
      assert.equal(activeRide, null);

      // Second cancellation: rejected with ConflictError (idempotent / cannot cancel already cancelled ride)
      await assert.rejects(
        async () => {
          await rideService.cancelRide(createdRide.id, riderUser.id);
        },
        (err) => {
          assert.ok(err instanceof ConflictError);
          assert.equal(err.statusCode, 409);
          return true;
        },
      );

      // Rider can now create a new ride without conflict
      const newRide = await rideService.createRide({
        userId: riderUser.id,
        pickup: "Assi Ghat",
        pickupLatitude: 25.289,
        pickupLongitude: 83.006,
        destination: "BHU Main Gate",
        destinationLatitude: 25.267,
        destinationLongitude: 82.991,
        vehicleType: "CAR",
        paymentMethod: "CASH",
      });

      assert.ok(newRide.id);
      assert.equal(newRide.status, "REQUESTED");

      // Cleanup
      await rideService.cancelRide(newRide.id, riderUser.id);
    });

    test("Status Policy Guard: Disallows cancelling non-cancellable ride states (e.g. COMPLETED)", async () => {
      // Create and directly transition a ride to COMPLETED in database
      const completedRide = await prisma.ride.create({
        data: {
          userId: riderUser.id,
          pickup: "Point A",
          destination: "Point B",
          pickupLatitude: 25.30,
          pickupLongitude: 82.97,
          destinationLatitude: 25.32,
          destinationLongitude: 82.99,
          distance: 5.0,
          vehicleType: "CAR",
          status: "COMPLETED",
          finalFare: 150.0,
        },
      });

      // Cancellation must be rejected by backend status guard
      await assert.rejects(
        async () => {
          await rideService.cancelRide(completedRide.id, riderUser.id);
        },
        (err) => {
          assert.ok(err instanceof ConflictError);
          assert.equal(err.statusCode, 409);
          assert.match(err.message, /Ride cannot be cancelled/);
          return true;
        },
      );

      await prisma.ride.delete({ where: { id: completedRide.id } });
    });
  });
});
