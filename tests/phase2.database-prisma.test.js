process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const prisma = require("../src/config/prisma");

describe("PHASE 2: Database & Prisma Integrity", () => {
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
  let schemaContent;

  test("Prisma schema file exists and loads", () => {
    assert.ok(fs.existsSync(schemaPath), "schema.prisma must exist");
    schemaContent = fs.readFileSync(schemaPath, "utf-8");
    assert.ok(schemaContent.length > 0);
  });

  test("Schema models declare required unique constraints", () => {
    const requiredUniques = [
      { model: "User", field: "email" },
      { model: "User", field: "phone" },
      { model: "Driver", field: "userId" },
      { model: "Driver", field: "licenseNumber" },
      { model: "Driver", field: "aadharNumber" },
      { model: "Vehicle", field: "driverId" },
      { model: "Vehicle", field: "vehicleNumber" },
      { model: "Payment", field: "rideId" },
      { model: "Coupon", field: "code" },
      { model: "CouponUsage", field: "rideId" },
      { model: "Ticket", field: "ticketNumber" },
      { model: "SystemSetting", field: "key" },
      { model: "Backup", field: "filename" },
    ];

    for (const { model, field } of requiredUniques) {
      const modelRegex = new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\}`, "m");
      const match = schemaContent.match(modelRegex);
      assert.ok(match, `Model ${model} must exist in schema`);
      const modelBody = match[1];
      const fieldRegex = new RegExp(`^\\s*${field}\\s+.*@unique`, "m");
      assert.ok(
        fieldRegex.test(modelBody) || modelBody.includes(`@@unique([${field}`),
        `Model ${model} must have unique constraint on ${field}`,
      );
    }
  });

  test("Schema composite unique constraints are present", () => {
    assert.match(schemaContent, /@@unique\(\[driverId,\s*documentType\]\)/);
    assert.match(schemaContent, /@@unique\(\[vehicleId,\s*documentType\]\)/);
    assert.match(schemaContent, /@@unique\(\[userId,\s*documentType\]\)/);
    assert.match(schemaContent, /@@unique\(\[city,\s*vehicleType\]\)/);
    assert.match(schemaContent, /@@unique\(\[rideId,\s*driverId\]\)/);
    assert.match(schemaContent, /@@unique\(\[name,\s*type\]\)/);
  });

  test("Schema cascade behavior: User deletion cascades to child records, Driver cascades to vehicle", () => {
    assert.match(schemaContent, /user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    assert.match(schemaContent, /driver\s+Driver\s+@relation\(fields:\s*\[driverId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    assert.match(schemaContent, /user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    assert.match(schemaContent, /ride\s+Ride\s+@relation\(fields:\s*\[rideId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    assert.match(schemaContent, /ride\s+Ride\s+@relation\(fields:\s*\[rideId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
  });

  test("Schema soft-delete and index coverage on search/filter columns", () => {
    assert.match(schemaContent, /@@index\(\[isBlocked\]\)/);
    assert.match(schemaContent, /@@index\(\[deletedAt\]\)/);
    assert.match(schemaContent, /@@index\(\[status\]\)/);
    assert.match(schemaContent, /@@index\(\[userId\]\)/);
    assert.match(schemaContent, /@@index\(\[driverId\]\)/);
  });

  test("Enums integrity: Validates key enterprise enums", () => {
    const checkEnum = (enumName, expectedValues) => {
      const enumRegex = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, "m");
      const match = schemaContent.match(enumRegex);
      assert.ok(match, `Enum ${enumName} must exist in schema`);
      const body = match[1];
      for (const val of expectedValues) {
        assert.ok(body.includes(val), `Enum ${enumName} must contain ${val}`);
      }
    };

    checkEnum("UserRole", ["USER", "DRIVER", "ADMIN", "SUPER_ADMIN", "SUPPORT_EXECUTIVE"]);
    checkEnum("DriverStatus", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
    checkEnum("DriverAvailability", ["OFFLINE", "AVAILABLE", "BUSY"]);
    checkEnum("VehicleType", ["BIKE", "AUTO", "CAR", "SUV"]);
    checkEnum("VehicleCategory", ["ECONOMY", "PREMIUM", "LUXURY"]);
    checkEnum("VehicleStatus", ["PENDING", "APPROVED", "REJECTED"]);
    checkEnum("RideStatus", ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED"]);
    checkEnum("PaymentStatus", ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"]);
    checkEnum("PaymentMethod", ["CASH", "UPI", "CARD", "WALLET"]);
    checkEnum("CouponType", ["FLAT", "PERCENTAGE"]);
  });

  test("Transaction boundary: Atomic rollback on failure guarantees no orphan records", async () => {
    const testEmail = `rollback-test-${Date.now()}@goride.internal`;
    let errorThrown = false;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            fullName: "Rollback Test User",
            email: testEmail,
            phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: "hashedpassword123",
          },
        });

        throw new Error("Simulated intentional failure inside transaction");
      });
    } catch (err) {
      errorThrown = true;
      assert.equal(err.message, "Simulated intentional failure inside transaction");
    }

    assert.equal(errorThrown, true, "Transaction must fail and throw");

    const userAfter = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert.equal(userAfter, null, "User record must have been rolled back and not persisted");
  });

  test("Live Cascade Deletion & Foreign Key Integrity: Deleting User cascades to Driver and Vehicle", async () => {
    const unique = Date.now();
    const cascadeUser = await prisma.user.create({
      data: {
        fullName: "Cascade User",
        email: `cascade_${unique}@goride.internal`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    const cascadeDriver = await prisma.driver.create({
      data: {
        userId: cascadeUser.id,
        licenseNumber: `DL_CAS_${unique.toString().slice(-6)}`,
        aadharNumber: `777777${unique.toString().slice(-6)}`,
        experience: 3,
      },
    });

    const cascadeVehicle = await prisma.vehicle.create({
      data: {
        driverId: cascadeDriver.id,
        vehicleNumber: `DL_C_${unique.toString().slice(-4)}`,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Maruti",
        model: "Swift",
        color: "Blue",
        seats: 4,
      },
    });

    assert.ok(cascadeVehicle.id);

    // Delete parent user
    await prisma.user.delete({ where: { id: cascadeUser.id } });

    // Assert driver and vehicle were cascade-deleted without orphan records
    const driverAfter = await prisma.driver.findUnique({ where: { id: cascadeDriver.id } });
    const vehicleAfter = await prisma.vehicle.findUnique({ where: { id: cascadeVehicle.id } });

    assert.equal(driverAfter, null, "Driver must be cascade-deleted when user is deleted");
    assert.equal(vehicleAfter, null, "Vehicle must be cascade-deleted when driver is deleted");
  });

  test("Unique Constraint Enforcement: Database engine rejects duplicate records with P2002", async () => {
    const unique = Date.now();
    const dupEmail = `dup_check_${unique}@goride.internal`;
    const phone = `90${Math.floor(10000000 + Math.random() * 90000000)}`;

    const user = await prisma.user.create({
      data: {
        fullName: "Original User",
        email: dupEmail,
        phone,
        password: "hashedPassword123",
      },
    });

    // Attempt to create second user with duplicate email
    await assert.rejects(
      async () => {
        await prisma.user.create({
          data: {
            fullName: "Duplicate User",
            email: dupEmail,
            phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: "hashedPassword123",
          },
        });
      },
      (err) => {
        assert.equal(err.code, "P2002", "Prisma unique constraint violation code must be P2002");
        return true;
      },
    );

    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("Pagination, Sorting and Filtering on queries", async () => {
    const usersAsc = await prisma.user.findMany({
      take: 5,
      skip: 0,
      orderBy: { createdAt: "asc" },
      where: { role: "USER" },
    });

    assert.ok(Array.isArray(usersAsc));
    assert.ok(usersAsc.length <= 5);

    const usersDesc = await prisma.user.findMany({
      take: 5,
      skip: 0,
      orderBy: { createdAt: "desc" },
      where: { role: "USER" },
    });

    assert.ok(Array.isArray(usersDesc));
  });
});
