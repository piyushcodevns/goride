process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const adminAuthService = require("../src/services/admin/adminAuth.service");
const adminUserService = require("../src/services/admin/adminUser.service");
const adminDriverService = require("../src/services/admin/adminDriver.service");
const adminVehicleService = require("../src/services/admin/adminVehicle.service");
const adminDashboardService = require("../src/services/admin/adminDashboard.service");
const adminPricingService = require("../src/services/admin/adminPricing.service");
const adminAuditService = require("../src/services/admin/adminAudit.service");
const adminRbacService = require("../src/services/admin/adminRbac.service");
const {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require("../src/utils/AppError");

describe("PHASE 14: Comprehensive Admin Panel, RBAC & Destructive Operations", () => {
  const uniqueId = Date.now();
  let superAdmin, supportAdmin, normalUser;
  let targetUser, testDriver, testVehicle;

  test("Setup admin fixtures: SUPER_ADMIN, SUPPORT_EXECUTIVE, USER", async () => {
    // 1. Super Admin
    superAdmin = await prisma.user.create({
      data: {
        fullName: "Phase14 Super Admin",
        email: `p14_super_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash("SuperPass@123", 10),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    // 2. Support Executive
    supportAdmin = await prisma.user.create({
      data: {
        fullName: "Phase14 Support Exec",
        email: `p14_support_${uniqueId}@goride.internal`,
        phone: `6${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash("SupportPass@123", 10),
        role: "ADMIN",
        isActive: true,
      },
    });

    // 3. Normal User
    normalUser = await prisma.user.create({
      data: {
        fullName: "Phase14 Normal User",
        email: `p14_normal_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash("UserPass@123", 10),
        role: "USER",
        isActive: true,
      },
    });

    // 4. Target User for admin operations
    targetUser = await prisma.user.create({
      data: {
        fullName: "Phase14 Target User",
        email: `p14_target_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash("TargetPass@123", 10),
        role: "USER",
        isActive: true,
      },
    });

    assert.ok(superAdmin.id);
    assert.ok(supportAdmin.id);
    assert.ok(normalUser.id);
    assert.ok(targetUser.id);
  });

  test("RBAC Boundary: SUPPORT_EXECUTIVE denied destructive permissions", async () => {
    // SUPPORT_EXECUTIVE role permissions
    const permissions = await adminRbacService.getPermissionsForRole("SUPPORT_EXECUTIVE");
    assert.ok(Array.isArray(permissions));
    assert.ok(permissions.includes("user:view"));
    assert.ok(permissions.includes("support:view"));

    // Destructive permissions MUST be excluded
    assert.equal(permissions.includes("user:delete"), false, "Support cannot delete users");
    assert.equal(permissions.includes("backup:manage"), false, "Support cannot manage backups");
    assert.equal(permissions.includes("rbac:manage"), false, "Support cannot manage roles");
  });

  test("Dashboard Metrics: getDashboardData aggregates data cleanly", async () => {
    const overview = await adminDashboardService.getDashboardData();
    assert.ok(overview);
    assert.ok(overview.users);
    assert.ok(overview.drivers);
    assert.ok(typeof overview.users.total === "number");
    assert.ok(typeof overview.drivers.total === "number");
  });

  test("User Management: Listing, pagination, and soft deletion with audit trail", async () => {
    // 1. List users
    const userList = await adminUserService.getUsers({
      page: 1,
      limit: 10,
      search: targetUser.email,
    });

    assert.ok(userList.users);
    assert.ok(userList.users.length >= 1);
    assert.equal(userList.users[0].id, targetUser.id);

    // 2. Soft delete user by Super Admin
    const deleted = await adminUserService.deleteUser({
      userId: targetUser.id,
      adminId: superAdmin.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.equal(deleted.isActive, false);
    assert.ok(deleted.deletedAt instanceof Date);

    // 3. Duplicate deletion throws ConflictError
    await assert.rejects(
      async () => {
        await adminUserService.deleteUser({
          userId: targetUser.id,
          adminId: superAdmin.id,
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "User is already deleted.");
        return true;
      },
    );

    // 4. Verify AuditLog in DB
    const audit = await prisma.auditLog.findFirst({
      where: {
        adminId: superAdmin.id,
        entityId: targetUser.id,
        action: "DELETE",
      },
    });
    assert.ok(audit, "User deletion must generate an audit log");
    assert.equal(audit.entity, "USER");
  });

  test("Driver Onboarding Workflow: Enforces required documents on approval; rejects with audit", async () => {
    // Create candidate user & driver
    const driverUser = await prisma.user.create({
      data: {
        fullName: "Candidate Driver",
        email: `cand_driver_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
      },
    });

    testDriver = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: `DL${uniqueId.toString().slice(-8)}IN`,
        aadharNumber: `1234${uniqueId.toString().slice(-8)}`,
        experience: 5,
        status: "PENDING",
        availability: "OFFLINE",
      },
    });

    // 1. Attempt approval without required documents -> must throw ConflictError
    await assert.rejects(
      async () => {
        await adminDriverService.approveDriver({
          driverId: testDriver.id,
          adminId: superAdmin.id,
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("Required documents are not approved"));
        return true;
      },
    );

    // 2. Reject driver with reason
    const rejected = await adminDriverService.rejectDriver({
      driverId: testDriver.id,
      adminId: superAdmin.id,
      reason: "Missing KYC documents",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });
    assert.equal(rejected.status, "REJECTED");
  });

  test("Vehicle Verification Workflow: Admin approval and rejection", async () => {
    testVehicle = await prisma.vehicle.create({
      data: {
        driverId: testDriver.id,
        vehicleNumber: `DL14${uniqueId.toString().slice(-4)}`,
        vehicleType: "CAR",
        category: "ECONOMY",
        brand: "Maruti",
        model: "Swift",
        color: "Silver",
        seats: 4,
        status: "PENDING",
      },
    });

    // 1. Approve vehicle
    const approved = await adminVehicleService.approveVehicle({
      vehicleId: testVehicle.id,
      adminId: superAdmin.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });
    assert.equal(approved.status, "APPROVED");

    // 2. Reject vehicle with reason
    const rejected = await adminVehicleService.rejectVehicle({
      vehicleId: testVehicle.id,
      adminId: superAdmin.id,
      rejectionReason: "Incomplete insurance documentation",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });
    assert.equal(rejected.status, "REJECTED");
  });

  test("Audit Log Integrity: Admin actions are tracked and queryable", async () => {
    const logs = await adminAuditService.getAuditLogs({
      page: 1,
      limit: 10,
      adminId: superAdmin.id,
    });

    assert.ok(logs.data);
    assert.ok(logs.data.length >= 1);
    assert.equal(logs.data[0].adminId, superAdmin.id);
  });
});
