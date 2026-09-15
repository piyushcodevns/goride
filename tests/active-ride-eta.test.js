process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const { calculateVehicleDuration, getRouteDetails } = require("../src/services/openRoute.service");
const MapsCacheService = require("../src/services/maps-cache.service");

const razorpayGateway = require("../src/gateways/razorpay.gateway");

describe("Active Ride Resolution & Traffic-Aware ETA Logic", () => {
  let riderUser;

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
  });

  after(async () => {
    try {
      razorpayGateway.resetRazorpayClient();
      if (riderUser) {
        await prisma.ride.deleteMany({ where: { userId: riderUser.id } });
        await prisma.user.delete({ where: { id: riderUser.id } });
      }
      await prisma.$disconnect();
    } catch (_) {}
  });

  describe("Vehicle Duration & Static Route Estimate Audit", () => {
    test("Vehicle Duration: Bike is ~35% faster in dense urban streets than car", () => {
      // 1.1 km taking 11 mins by car:
      const carDuration = 11.0;
      const distance = 1.1;

      const bikeDur = calculateVehicleDuration(carDuration, "BIKE", distance);
      const autoDur = calculateVehicleDuration(carDuration, "AUTO", distance);
      const sedanDur = calculateVehicleDuration(carDuration, "SEDAN", distance);
      const suvDur = calculateVehicleDuration(carDuration, "SUV", distance);

      assert.equal(bikeDur, 7.15, "Bike should be 0.65x of car time");
      assert.equal(autoDur, 8.8, "Auto should be 0.80x of car time");
      assert.equal(sedanDur, 11.0, "Sedan/Car should match baseline car time");
      assert.equal(suvDur, 11.55, "SUV should be 1.05x of car time");

      // Verify strict monotonicity
      assert.ok(bikeDur < autoDur, "Bike must be faster than auto");
      assert.ok(autoDur < sedanDur, "Auto must be faster than car");
      assert.ok(sedanDur <= suvDur, "Car must be faster than or equal to SUV");
    });

    test("Vehicle Duration: Enforces realistic speed bounds (min 4 km/h crawl, max 45 km/h cap)", () => {
      // Extremely high theoretical speed: 10 km in 1 minute -> capped at 45 km/h (13.33 mins)
      const cappedFast = calculateVehicleDuration(1, "BIKE", 10);
      assert.ok(cappedFast >= 13.3, "Cannot travel faster than 45 km/h speed cap");

      // Minimum duration floor is always at least 1 minute
      const shortTrip = calculateVehicleDuration(0.1, "BIKE", 0.05);
      assert.ok(shortTrip >= 1.0, "Minimum duration must be >= 1 min");
    });

    test("Route Details: Explicitly labels route as static estimate without live traffic", async () => {
      // Seed route in cache
      const start = { latitude: 25.3176, longitude: 82.9739 };
      const end = { latitude: 25.3276, longitude: 82.9839 };

      MapsCacheService.setRoute(
        Number(start.latitude).toFixed(6),
        Number(start.longitude).toFixed(6),
        Number(end.latitude).toFixed(6),
        Number(end.longitude).toFixed(6),
        {
          distance: 1.5,
          duration: 12.0,
          baseDuration: 12.0,
          eta: "12 minutes",
          geometry: "mock_polyline",
        },
      );

      const routeBike = await getRouteDetails(start, end, "BIKE");
      assert.equal(routeBike.trafficModel, "STATIC_ROUTE_ESTIMATE");
      assert.equal(routeBike.isTrafficAware, false);
      assert.equal(routeBike.duration, 7.8);
      assert.equal(routeBike.eta, "8 minutes");

      const routeCar = await getRouteDetails(start, end, "CAR");
      assert.equal(routeCar.trafficModel, "STATIC_ROUTE_ESTIMATE");
      assert.equal(routeCar.isTrafficAware, false);
      assert.equal(routeCar.duration, 12.0);
      assert.equal(routeCar.eta, "12 minutes");
    });
  });

  describe("Active Ride State Machine & Resolution", () => {
    let createdRide;

    test("Active ride detection: Returns PAYMENT_PENDING ride and blocks duplicate booking", async () => {
      // Create ride with online payment (UPI) -> enters PAYMENT_PENDING
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

      // Verify getActiveRideForUser finds it
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
          assert.ok(err.data);
          assert.ok(err.data.activeRide);
          assert.equal(err.data.activeRide.id, createdRide.id);
          assert.equal(err.data.activeRide.status, "PAYMENT_PENDING");
          return true;
        },
      );
    });

    test("Active ride cancellation: Cancelling PAYMENT_PENDING ride unblocks booking", async () => {
      // Cancel the pending ride
      const cancelResult = await rideService.cancelRide(createdRide.id, riderUser.id);
      assert.equal(cancelResult.status, "CANCELLED");

      // Verify active ride is now null
      const activeRide = await rideService.getActiveRideForUser(riderUser.id);
      assert.equal(activeRide, null);

      // Rider can now create a new ride without 409 conflict
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
  });
});
