process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { authorize } = require("../src/middleware/authorize.middleware");
const { requirePermission } = require("../src/middleware/admin/adminRbac.middleware");
const roles = require("../src/constants/adminRoles");
const matrix = require("../src/constants/adminRolePermissions");
const rideService = require("../src/services/ride.service");
const paymentService = require("../src/services/payment.service");
const rideReviewService = require("../src/services/rideReview.service");
const rideRepository = require("../src/repositories/ride.repository");
const { ForbiddenError, UnauthorizedError } = require("../src/utils/AppError");

describe("PHASE 4: RBAC & Horizontal Privilege Escalation Protection", () => {
  const invokeMiddleware = (middleware, req) =>
    new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          resolve({ status: this.statusCode, body: payload, error: null });
        },
      };

      middleware(req, res, (err) => {
        resolve({
          status: err?.statusCode || res.statusCode,
          body: null,
          error: err || null,
        });
      });
    });

  test("authorize middleware rejects unauthenticated request with ForbiddenError", async () => {
    const middleware = authorize("ADMIN", "DRIVER");
    const req = { user: null };
    const result = await invokeMiddleware(middleware, req);
    assert.ok(result.error instanceof ForbiddenError);
    assert.equal(result.error.message, "Authentication required.");
  });

  test("authorize middleware rejects user with wrong role", async () => {
    const middleware = authorize("ADMIN", "DRIVER");
    const req = { user: { id: "u1", role: "USER" } };
    const result = await invokeMiddleware(middleware, req);
    assert.ok(result.error instanceof ForbiddenError);
    assert.equal(result.error.message, "You are not authorized to access this resource.");
  });

  test("authorize middleware allows user with correct role", async () => {
    const middleware = authorize("ADMIN", "DRIVER");
    const req = { user: { id: "d1", role: "DRIVER" } };
    const result = await invokeMiddleware(middleware, req);
    assert.equal(result.error, null);
  });

  test("authorize middleware allows SUPER_ADMIN unconditionally", async () => {
    const middleware = authorize("FINANCE_MANAGER");
    const req = { user: { id: "sa1", role: "SUPER_ADMIN" } };
    const result = await invokeMiddleware(middleware, req);
    assert.equal(result.error, null);
  });

  test("admin RBAC: requirePermission allows SUPER_ADMIN for all system permissions", async () => {
    const testPermissions = ["user:delete", "pricing:update", "backup:create", "driver:approve"];
    for (const perm of testPermissions) {
      const middleware = requirePermission(perm);
      const req = { admin: { id: "admin_super", role: roles.SUPER_ADMIN } };
      const result = await invokeMiddleware(middleware, req);
      assert.equal(result.error, null, `SUPER_ADMIN must have permission: ${perm}`);
    }
  });

  test("admin RBAC: rejects admin lacking required permission", async () => {
    const middleware = requirePermission("backup:create");
    const req = { admin: { id: "support_1", role: roles.SUPPORT_EXECUTIVE } };
    const result = await invokeMiddleware(middleware, req);
    assert.ok(result.error instanceof ForbiddenError);
    assert.equal(result.error.message, "You do not have permission to perform this action.");
  });

  test("Admin Privilege Boundaries: SUPPORT_EXECUTIVE denied delete and backup actions", () => {
    const supportPerms = matrix[roles.SUPPORT_EXECUTIVE];
    assert.ok(!supportPerms.includes("user:delete"), "SUPPORT_EXECUTIVE must not have user:delete");
    assert.ok(!supportPerms.includes("backup:create"), "SUPPORT_EXECUTIVE must not have backup:create");
    assert.ok(!supportPerms.includes("backup:restore"), "SUPPORT_EXECUTIVE must not have backup:restore");
  });

  test("Horizontal Privilege Escalation: User A cannot cancel User B ride", async () => {
    const originalGetRideById = rideRepository.getRideById;
    rideRepository.getRideById = async (rideId) => ({
      id: rideId,
      userId: "user_B",
      driverId: "driver_1",
      status: "REQUESTED",
    });

    try {
      await assert.rejects(
        async () => {
          await rideService.cancelRide("ride_123", "user_A");
        },
        (err) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Unauthorized.");
          return true;
        },
      );
    } finally {
      rideRepository.getRideById = originalGetRideById;
    }
  });

  test("Horizontal Privilege Escalation: Driver A cannot update Driver B ride status", async () => {
    const originalGetRideById = rideRepository.getRideById;
    rideRepository.getRideById = async (rideId) => ({
      id: rideId,
      userId: "user_1",
      driverId: "driver_B",
      status: "ACCEPTED",
    });

    try {
      await assert.rejects(
        async () => {
          await rideService.updateRideStatus("ride_123", "driver_A", "ARRIVED");
        },
        (err) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Unauthorized.");
          return true;
        },
      );
    } finally {
      rideRepository.getRideById = originalGetRideById;
    }
  });

  test("Horizontal Privilege Escalation: User A cannot create payment for User B ride", async () => {
    const originalGetRideById = rideRepository.getRideById;
    rideRepository.getRideById = async (rideId) => ({
      id: rideId,
      userId: "user_B",
      status: "COMPLETED",
      finalFare: 250.0,
    });

    try {
      await assert.rejects(
        async () => {
          await paymentService.createPayment({
            rideId: "ride_123",
            userId: "user_A", // Not the owner
            paymentMethod: "CASH",
          });
        },
        (err) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.message, "Unauthorized payment request.");
          return true;
        },
      );
    } finally {
      rideRepository.getRideById = originalGetRideById;
    }
  });

  test("Horizontal Privilege Escalation: User A cannot review User B ride", async () => {
    const originalGetRideById = rideRepository.getRideById;
    rideRepository.getRideById = async (rideId) => ({
      id: rideId,
      userId: "user_B",
      driverId: "driver_1",
      status: "COMPLETED",
    });

    try {
      await assert.rejects(
        async () => {
          await rideReviewService.createReview({
            rideId: "ride_123",
            userId: "user_A", // Not the owner
            rating: 5,
            review: "Great ride",
          });
        },
        (err) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.message, "You can review only your own rides.");
          return true;
        },
      );
    } finally {
      rideRepository.getRideById = originalGetRideById;
    }
  });
});
