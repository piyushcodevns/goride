const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const vehicleService = require("../src/services/vehicle.service");
const adminVehicleService = require("../src/services/admin/adminVehicle.service");
const { BadRequestError, NotFoundError } = require("../src/utils/AppError");

describe("PHASE 7: Vehicle Onboarding, 1:1 Constraint & Admin Verification", () => {
  const uniqueId = Date.now();
  let driverUser1, driverUser2;
  let driver1, driver2;
  let adminUser;
  const vehicleNumber1 = `DL01AB${uniqueId.toString().slice(-4)}`;
  let registeredVehicle;

  test("Setup driver and admin fixtures", async () => {
    adminUser = await prisma.user.create({
      data: {
        fullName: "Vehicle Admin",
        email: `vadmin_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "ADMIN",
      },
    });

    driverUser1 = await prisma.user.create({
      data: {
        fullName: "Vehicle Driver 1",
        email: `vdriver1_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    driver1 = await prisma.driver.create({
      data: {
        userId: driverUser1.id,
        licenseNumber: `DL_V1_${uniqueId.toString().slice(-6)}`,
        aadharNumber: `111111${uniqueId.toString().slice(-6)}`,
        experience: 4,
        status: "APPROVED",
      },
    });

    driverUser2 = await prisma.user.create({
      data: {
        fullName: "Vehicle Driver 2",
        email: `vdriver2_${uniqueId}@goride.internal`,
        phone: `6${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    driver2 = await prisma.driver.create({
      data: {
        userId: driverUser2.id,
        licenseNumber: `DL_V2_${uniqueId.toString().slice(-6)}`,
        aadharNumber: `222222${uniqueId.toString().slice(-6)}`,
        experience: 2,
        status: "APPROVED",
      },
    });

    assert.ok(driver1.id);
    assert.ok(driver2.id);
  });

  test("Vehicle Registration: successfully registers vehicle with PENDING status", async () => {
    registeredVehicle = await vehicleService.addVehicle(driverUser1.id, {
      vehicleNumber: vehicleNumber1,
      vehicleType: "CAR",
      category: "ECONOMY",
      brand: "Maruti",
      model: "Dzire",
      color: "White",
      seats: 4,
    });

    assert.ok(registeredVehicle.id);
    assert.equal(registeredVehicle.driverId, driver1.id);
    assert.equal(registeredVehicle.vehicleNumber, vehicleNumber1);
    assert.equal(registeredVehicle.status, "PENDING");
  });

  test("1:1 Vehicle Constraint: Driver cannot register a second vehicle", async () => {
    await assert.rejects(
      async () => {
        await vehicleService.addVehicle(driverUser1.id, {
          vehicleNumber: `DL01CD${uniqueId.toString().slice(-4)}`,
          vehicleType: "SUV",
          category: "PREMIUM",
          brand: "Toyota",
          model: "Innova",
          color: "Silver",
          seats: 6,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Driver already has a registered vehicle.");
        return true;
      },
    );
  });

  test("Vehicle Uniqueness: Rejects duplicate vehicle registration number", async () => {
    await assert.rejects(
      async () => {
        await vehicleService.addVehicle(driverUser2.id, {
          vehicleNumber: vehicleNumber1, // Duplicate vehicle number
          vehicleType: "CAR",
          category: "ECONOMY",
          brand: "Hyundai",
          model: "Aura",
          color: "Silver",
          seats: 4,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Vehicle number already exists.");
        return true;
      },
    );
  });

  test("Vehicle Validation: Rejects invalid vehicle type and category enums", async () => {
    await assert.rejects(
      async () => {
        await vehicleService.addVehicle(driverUser2.id, {
          vehicleNumber: `DL02XY${uniqueId.toString().slice(-4)}`,
          vehicleType: "TRUCK_INVALID",
          category: "SUPERCAR_INVALID",
          brand: "Volvo",
          model: "FH16",
          color: "Blue",
          seats: 2,
        });
      },
      (err) => {
        return err.name === "ZodError";
      },
    );
  });

  test("Admin Vehicle Approval: Approves vehicle with audit trail", async () => {
    const approved = await adminVehicleService.approveVehicle({
      vehicleId: registeredVehicle.id,
      adminId: adminUser.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.equal(approved.status, "APPROVED");

    const inDb = await prisma.vehicle.findUnique({ where: { id: registeredVehicle.id } });
    assert.equal(inDb.status, "APPROVED");
  });

  test("Vehicle Documents: Enforces DB ownership chain (User -> Driver -> Vehicle)", async () => {
    // Normal user without driver profile cannot upload vehicle document
    const nonDriver = await prisma.user.create({
      data: {
        fullName: "Non Driver User",
        email: `nondriver_${uniqueId}@goride.internal`,
        phone: `5${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    await assert.rejects(
      async () => {
        await vehicleService.uploadVehicleDocument(
          nonDriver.id,
          { documentType: "RC" },
          { originalname: "rc.pdf", buffer: Buffer.from("%PDF-1.4"), mimetype: "application/pdf", size: 1024 },
        );
      },
      (err) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Driver profile not found.");
        return true;
      },
    );
  });
});
