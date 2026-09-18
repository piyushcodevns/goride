process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const rideService = require("../src/services/ride.service");
const rideRepository = require("../src/repositories/ride.repository");
const { BadRequestError, ConflictError, UnauthorizedError } = require("../src/utils/AppError");

describe("PHASE 8: Complete Ride Lifecycle, State Machine & Concurrency", () => {
  const uniqueId = Date.now();
  let riderUser, driverUser1, driverUser2;
  let driver1, driver2;
  let vehicle1, vehicle2;

  test("Setup rider, drivers, and vehicles for lifecycle testing", async () => {
    riderUser = await prisma.user.create({
      data: {
        fullName: "Rider Phase 8",
        email: `rider_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    driverUser1 = await prisma.user.create({
      data: {
        fullName: "Driver 1 Phase 8",
        email: `d1_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    driver1 = await prisma.driver.create({
      data: {
        userId: driverUser1.id,
        licenseNumber: `DL8A_${uniqueId.toString().slice(-6)}`,
        aadharNumber: `818181${uniqueId.toString().slice(-6)}`,
        experience: 4,
        status: "APPROVED",
        availability: "AVAILABLE",
      },
    });

    vehicle1 = await prisma.vehicle.create({
      data: {
        driverId: driver1.id,
        vehicleNumber: `DL8A${uniqueId.toString().slice(-4)}`,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Maruti",
        model: "WagonR",
        color: "Silver",
        seats: 4,
        status: "APPROVED",
      },
    });

    driverUser2 = await prisma.user.create({
      data: {
        fullName: "Driver 2 Phase 8",
        email: `d2_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    driver2 = await prisma.driver.create({
      data: {
        userId: driverUser2.id,
        licenseNumber: `DL8B_${uniqueId.toString().slice(-6)}`,
        aadharNumber: `828282${uniqueId.toString().slice(-6)}`,
        experience: 3,
        status: "APPROVED",
        availability: "AVAILABLE",
      },
    });

    vehicle2 = await prisma.vehicle.create({
      data: {
        driverId: driver2.id,
        vehicleNumber: `DL8B${uniqueId.toString().slice(-4)}`,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Tata",
        model: "Tiago",
        color: "White",
        seats: 4,
        status: "APPROVED",
      },
    });

    assert.ok(riderUser.id);
    assert.ok(driver1.id);
    assert.ok(driver2.id);
  });

  test("Create Ride Validation: Rejects identical pickup and destination", async () => {
    await assert.rejects(
      async () => {
        await rideService.createRide({
          userId: riderUser.id,
          pickup: "Connaught Place, New Delhi",
          destination: "Connaught Place, New Delhi",
          pickupLatitude: 28.6315,
          pickupLongitude: 77.2167,
          destinationLatitude: 28.6315,
          destinationLongitude: 77.2167,
          vehicleType: "CAR",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Pickup and destination cannot be same.");
        return true;
      },
    );
  });

  test("Create Ride Validation: Rejects missing coordinates", async () => {
    await assert.rejects(
      async () => {
        await rideService.createRide({
          userId: riderUser.id,
          pickup: "Connaught Place, New Delhi",
          destination: "India Gate, New Delhi",
          pickupLatitude: null,
          pickupLongitude: 77.2167,
          destinationLatitude: 28.6129,
          destinationLongitude: 77.2295,
          vehicleType: "CAR",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Valid pickup and destination coordinates"));
        return true;
      },
    );
  });

  test("Scheduled Ride Validation: Rejects past time and <15m advance time", async () => {
    // Past date
    await assert.rejects(
      async () => {
        await rideService.createRide({
          userId: riderUser.id,
          pickup: "Connaught Place",
          destination: "India Gate",
          pickupLatitude: 28.6315,
          pickupLongitude: 77.2167,
          destinationLatitude: 28.6129,
          destinationLongitude: 77.2295,
          vehicleType: "CAR",
          isScheduled: true,
          scheduledFor: new Date(Date.now() - 60000).toISOString(),
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Scheduled ride must be in the future.");
        return true;
      },
    );

    // Only 5 minutes ahead (must be >= 15 min)
    await assert.rejects(
      async () => {
        await rideService.createRide({
          userId: riderUser.id,
          pickup: "Connaught Place",
          destination: "India Gate",
          pickupLatitude: 28.6315,
          pickupLongitude: 77.2167,
          destinationLatitude: 28.6129,
          destinationLongitude: 77.2295,
          vehicleType: "CAR",
          isScheduled: true,
          scheduledFor: new Date(Date.now() + 5 * 60000).toISOString(),
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Scheduled ride must be at least 15 minutes in advance.");
        return true;
      },
    );
  });

  test("Complete Lifecycle: REQUESTED -> ACCEPTED -> ARRIVED -> STARTED -> COMPLETED", async () => {
    // 1. Create a fresh ride directly in database with fare audit
    const ride = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Connaught Place",
        destination: "Cyber City Gurugram",
        distance: 28.5,
        duration: 45,
        vehicleType: "CAR",
        status: "REQUESTED",
        baseFare: 50,
        estimatedFare: 450,
        finalFare: 450,
      },
    });

    assert.equal(ride.status, "REQUESTED");
    assert.equal(ride.driverId, null);

    // 2. Assign driver -> ACCEPTED
    const acceptedRide = await rideService.assignDriver(ride.id, driver1.id);
    assert.equal(acceptedRide.status, "ACCEPTED");
    assert.equal(acceptedRide.driverId, driver1.id);

    // Driver availability should be set to BUSY
    const d1Busy = await prisma.driver.findUnique({ where: { id: driver1.id } });
    assert.equal(d1Busy.availability, "BUSY");

    // 3. Driver arrives -> ARRIVED
    const arrivedRide = await rideService.updateRideStatus(ride.id, driver1.id, "ARRIVED");
    assert.equal(arrivedRide.status, "ARRIVED");

    // 4. Driver starts trip -> STARTED
    const startedRide = await rideService.updateRideStatus(ride.id, driver1.id, "STARTED");
    assert.equal(startedRide.status, "STARTED");

    // 5. Driver completes trip -> COMPLETED
    const completedRide = await rideService.updateRideStatus(ride.id, driver1.id, "COMPLETED");
    assert.equal(completedRide.status, "COMPLETED");

    // Driver availability should be released back to AVAILABLE
    const d1Available = await prisma.driver.findUnique({ where: { id: driver1.id } });
    assert.equal(d1Available.availability, "AVAILABLE");
  });

  test("Invalid Transitions: Rejects jumping states or reversing completed rides", async () => {
    const testRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Point A",
        destination: "Point B",
        distance: 5.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    // Cannot jump from REQUESTED directly to STARTED
    await assert.rejects(
      async () => {
        await rideService.updateRideStatus(testRide.id, driver2.id, "STARTED");
      },
      (err) => {
        return err instanceof UnauthorizedError || err instanceof BadRequestError;
      },
    );

    // Set ride to COMPLETED directly
    await prisma.ride.update({
      where: { id: testRide.id },
      data: { status: "COMPLETED", driverId: driver2.id },
    });

    // Double completion: Cannot transition COMPLETED -> COMPLETED
    await assert.rejects(
      async () => {
        await rideService.updateRideStatus(testRide.id, driver2.id, "COMPLETED");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Invalid ride status transition"));
        return true;
      },
    );

    // Cannot cancel a COMPLETED ride
    await assert.rejects(
      async () => {
        await rideService.cancelRide(testRide.id, riderUser.id);
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "Ride cannot be cancelled.");
        return true;
      },
    );
  });

  test("Concurrent Driver Assignment: Atomic lock allows exactly one driver to accept", async () => {
    // Reset both drivers to AVAILABLE
    await prisma.driver.update({ where: { id: driver1.id }, data: { availability: "AVAILABLE" } });
    await prisma.driver.update({ where: { id: driver2.id }, data: { availability: "AVAILABLE" } });

    const contestedRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Market Central",
        destination: "Tech Park",
        distance: 12.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    // Both drivers race to assignDriver simultaneously
    const results = await Promise.allSettled([
      rideService.assignDriver(contestedRide.id, driver1.id),
      rideService.assignDriver(contestedRide.id, driver2.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one driver must successfully claim the ride");
    assert.equal(rejected.length, 1, "The second driver must be rejected due to conflict");
    assert.ok(
      rejected[0].reason instanceof ConflictError,
      "Second driver rejection must be a ConflictError",
    );

    // Verify ride in DB has status ACCEPTED and one of the two driver IDs
    const finalRide = await prisma.ride.findUnique({ where: { id: contestedRide.id } });
    assert.equal(finalRide.status, "ACCEPTED");
    assert.ok([driver1.id, driver2.id].includes(finalRide.driverId));

    // Clean up contested ride so subsequent tests start with clean state
    await prisma.ride.update({ where: { id: contestedRide.id }, data: { status: "COMPLETED" } });
    await prisma.driver.update({ where: { id: driver1.id }, data: { availability: "AVAILABLE" } });
    await prisma.driver.update({ where: { id: driver2.id }, data: { availability: "AVAILABLE" } });
  });

  test("Double Cancellation: Cannot cancel an already cancelled ride", async () => {
    const cancelRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Cancel Point A",
        destination: "Cancel Point B",
        distance: 10.0,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    // First cancellation succeeds
    const res1 = await rideService.cancelRide(cancelRide.id, riderUser.id);
    assert.equal(res1.status, "CANCELLED");

    // Second cancellation must throw ConflictError
    await assert.rejects(
      async () => {
        await rideService.cancelRide(cancelRide.id, riderUser.id);
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "Ride cannot be cancelled.");
        return true;
      },
    );
  });

  test("Driver Current Ride: Returns active ride when assigned, null when completed", async () => {
    // 1. Initially driver2 has no active ride
    const initialCurrent = await rideService.getDriverCurrentRide(driver2.id);
    assert.equal(initialCurrent, null);

    // 2. Create and assign ride to driver2
    const currentRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        driverId: driver2.id,
        pickup: "Current Ride Pickup",
        destination: "Current Ride Dest",
        distance: 5.0,
        vehicleType: "CAR",
        status: "ACCEPTED",
      },
    });

    const activeCurrent = await rideService.getDriverCurrentRide(driver2.id);
    assert.ok(activeCurrent);
    assert.equal(activeCurrent.id, currentRide.id);

    // 3. Move to COMPLETED -> current ride returns null
    await prisma.ride.update({
      where: { id: currentRide.id },
      data: { status: "COMPLETED" },
    });

    const completedCurrent = await rideService.getDriverCurrentRide(driver2.id);
    assert.equal(completedCurrent, null);
  });

  test("Scheduled Ride Sweep: Activates due scheduled rides idempotently", async () => {
    // Create a scheduled ride due in 5 minutes
    const dueScheduledRide = await prisma.ride.create({
      data: {
        userId: riderUser.id,
        pickup: "Scheduled Pickup",
        destination: "Scheduled Dest",
        distance: 7.0,
        vehicleType: "CAR",
        status: "REQUESTED",
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // 1. Process due scheduled rides with 15 min lead time
    const sweepResult = await rideService.processDueScheduledRides(15);
    assert.ok(sweepResult.totalChecked >= 1);
    assert.ok(sweepResult.activatedCount >= 1);

    // 2. Verify ride is no longer scheduled in DB
    const activatedRide = await prisma.ride.findUnique({ where: { id: dueScheduledRide.id } });
    assert.equal(activatedRide.isScheduled, false);

    // 3. Re-running sweep is idempotent (activatedCount = 0 for this ride)
    const idempotentSweep = await rideService.processDueScheduledRides(15);
    assert.equal(idempotentSweep.activatedCount, 0);
  });
});
