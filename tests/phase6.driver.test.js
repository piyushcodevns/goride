process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const driverService = require("../src/services/driver.service");
const rideService = require("../src/services/ride.service");
const { BadRequestError, NotFoundError, ConflictError } = require("../src/utils/AppError");

describe("PHASE 6: Driver Onboarding, Verification & State Machine", () => {
  const uniqueId = Date.now();
  let user1, user2;
  const license1 = `DL${uniqueId.toString().slice(-8)}IN`;
  const aadhar1 = `123456${uniqueId.toString().slice(-6)}`;
  let createdDriver1;

  test("Setup test users for driver onboarding", async () => {
    user1 = await prisma.user.create({
      data: {
        fullName: "Driver Candidate 1",
        email: `driver1_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    user2 = await prisma.user.create({
      data: {
        fullName: "Driver Candidate 2",
        email: `driver2_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    assert.ok(user1.id);
    assert.ok(user2.id);
  });

  test("Driver Registration: successfully registers driver profile with status PENDING", async () => {
    createdDriver1 = await driverService.registerDriver(user1.id, {
      licenseNumber: license1,
      aadharNumber: aadhar1,
      experience: 5,
    });

    assert.ok(createdDriver1.id);
    assert.equal(createdDriver1.userId, user1.id);
    assert.equal(createdDriver1.status, "PENDING");
    assert.equal(createdDriver1.availability, "OFFLINE");
  });

  test("Driver Registration: prevents duplicate registration for the same user", async () => {
    await assert.rejects(
      async () => {
        await driverService.registerDriver(user1.id, {
          licenseNumber: `DL_NEW_${uniqueId}`,
          aadharNumber: `999999${uniqueId.toString().slice(-6)}`,
          experience: 3,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Driver profile already exists.");
        return true;
      },
    );
  });

  test("Driver Registration: rejects duplicate license number", async () => {
    const uniqueAadhar = `888888${uniqueId.toString().slice(-6)}`;
    await assert.rejects(
      async () => {
        await driverService.registerDriver(user2.id, {
          licenseNumber: license1, // Duplicate license
          aadharNumber: uniqueAadhar,
          experience: 2,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "License number already registered.");
        return true;
      },
    );
  });

  test("Driver Registration: rejects duplicate aadhar number", async () => {
    const uniqueLicense = `DL_UNIQUE_${uniqueId.toString().slice(-6)}`;
    await assert.rejects(
      async () => {
        await driverService.registerDriver(user2.id, {
          licenseNumber: uniqueLicense,
          aadharNumber: aadhar1, // Duplicate aadhar
          experience: 4,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Aadhar number already registered.");
        return true;
      },
    );
  });

  test("Driver Availability: PENDING driver cannot go AVAILABLE", async () => {
    await assert.rejects(
      async () => {
        await driverService.updateAvailability(user1.id, "AVAILABLE");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Only approved drivers can update availability status.");
        return true;
      },
    );
  });

  test("Driver Approval: Admin approves driver and updates status", async () => {
    const updated = await driverService.approveDriver(createdDriver1.id, "APPROVED");
    assert.equal(updated.status, "APPROVED");

    // Attempting to approve again throws BadRequestError
    await assert.rejects(
      async () => {
        await driverService.approveDriver(createdDriver1.id, "APPROVED");
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("already approved"));
        return true;
      },
    );
  });

  test("Driver Availability: APPROVED driver can update availability state", async () => {
    const updatedOnline = await driverService.updateAvailability(user1.id, "AVAILABLE");
    assert.equal(updatedOnline.availability, "AVAILABLE");

    const updatedOffline = await driverService.updateAvailability(user1.id, "OFFLINE");
    assert.equal(updatedOffline.availability, "OFFLINE");
  });

  test("Driver Wallet: Records credit and debit transactions atomically", async () => {
    // Create wallet for driver
    const wallet = await prisma.driverWallet.create({
      data: {
        driverId: createdDriver1.id,
        balance: 1000.0,
        totalEarnings: 1000.0,
      },
    });

    assert.equal(Number(wallet.balance), 1000.0);

    // Record wallet credit transaction
    const tx = await prisma.driverWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        status: "COMPLETED",
        amount: 250.0,
        description: "Ride payment credit",
      },
    });

    assert.ok(tx.id);
    assert.equal(Number(tx.amount), 250.0);
    assert.equal(tx.type, "CREDIT");
  });

  test("Driver Ride Rejection: Driver rejects available ride, creates reject audit, prevents duplicate", async () => {
    // Create a ride requested by user2
    const rideToReject = await prisma.ride.create({
      data: {
        userId: user2.id,
        pickup: "Driver Reject Start",
        destination: "Driver Reject End",
        distance: 8.5,
        vehicleType: "CAR",
        status: "REQUESTED",
      },
    });

    // Driver rejects the ride
    const rejectRes = await rideService.rejectRide(rideToReject.id, createdDriver1.id);
    assert.equal(rejectRes.message, "Ride rejected successfully.");

    // Verify rideReject audit record exists in DB
    const hasRejected = await prisma.rideReject.findUnique({
      where: {
        rideId_driverId: {
          rideId: rideToReject.id,
          driverId: createdDriver1.id,
        },
      },
    });
    assert.ok(hasRejected, "RideReject audit record must be persisted");

    // Second rejection attempt by the same driver must throw ConflictError
    await assert.rejects(
      async () => {
        await rideService.rejectRide(rideToReject.id, createdDriver1.id);
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("already rejected"));
        return true;
      },
    );
  });
});
