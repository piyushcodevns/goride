const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const path = require("node:path");

const adminAuthMiddleware = require("../src/middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../src/middleware/admin/adminRbac.middleware");
const { canAccessRideFareAudit } = require("../src/services/fareAudit.service");
const matrix = require("../src/constants/adminRolePermissions");
const ADMIN_ROLES = require("../src/constants/adminRoles");
const { generateToken } = require("../src/utils/jwt");

const originalJwtSecret = process.env.JWT_SECRET;
const originalIssuer = process.env.JWT_ISSUER;
const originalAudience = process.env.JWT_AUDIENCE;

const invoke = (middleware, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ status: this.statusCode, body: payload, error: null });
        return this;
      },
    };

    middleware(req, res, (error) => {
      resolve({
        status: error?.statusCode || res.statusCode,
        body: res.body,
        error,
      });
    });
  });

const collectRoutes = (router) => {
  const routerAuth = router.stack.some(
    (layer) => !layer.route && layer.handle?.name === "adminAuthMiddleware",
  );

  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const names = layer.route.stack.map((item) => item.handle.name || "anonymous");
      return Object.keys(layer.route.methods).map((method) => ({
        method: method.toUpperCase(),
        path: layer.route.path,
        names,
        routerAuth,
      }));
    });
};

test("normal user tokens cannot authenticate admin middleware", async () => {
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-boundary";
  process.env.JWT_ISSUER = "goride";
  process.env.JWT_AUDIENCE = "goride-api";

  const missing = await invoke(adminAuthMiddleware, { headers: {} });
  assert.equal(missing.error.statusCode, 401);

  const userToken = generateToken({
    id: "user-a",
    email: "user-a@example.com",
    role: "USER",
    tokenType: "access",
  });

  const userAttempt = await invoke(adminAuthMiddleware, {
    headers: { authorization: `Bearer ${userToken}` },
  });
  assert.equal(userAttempt.error.statusCode, 401);

  const refreshToken = generateToken({
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
    sessionId: "session-1",
    tokenType: "refresh",
  });

  const refreshAttempt = await invoke(adminAuthMiddleware, {
    headers: { authorization: `Bearer ${refreshToken}` },
  });
  assert.equal(refreshAttempt.error.statusCode, 401);
});

test("revoked, inactive, and locked admin sessions are denied by adminAuthMiddleware", async () => {
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-boundary";
  process.env.JWT_ISSUER = "goride";
  process.env.JWT_AUDIENCE = "goride-api";

  const authRepository = require("../src/repositories/admin/adminAuth.repository");
  const originalFindSession = authRepository.findActiveAdminSessionById;
  const originalFindAdmin = authRepository.findAdminById;
  const originalTouch = authRepository.updateSessionLastActive;

  const token = generateToken({
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
    sessionId: "session-1",
    tokenType: "access",
  });
  const req = { headers: { authorization: `Bearer ${token}` } };

  authRepository.findActiveAdminSessionById = async () => null;
  const revoked = await invoke(adminAuthMiddleware, req);
  assert.equal(revoked.error.statusCode, 401);

  authRepository.findActiveAdminSessionById = async () => ({
    id: "session-1",
    userId: "admin-1",
  });
  authRepository.findAdminById = async () => ({
    id: "admin-1",
    role: "ADMIN",
    isActive: false,
    accountLockedUntil: null,
  });
  const inactive = await invoke(adminAuthMiddleware, req);
  assert.equal(inactive.error.statusCode, 403);

  authRepository.findAdminById = async () => ({
    id: "admin-1",
    role: "ADMIN",
    isActive: true,
    accountLockedUntil: new Date(Date.now() + 60 * 1000),
  });
  const locked = await invoke(adminAuthMiddleware, req);
  assert.equal(locked.error.statusCode, 403);

  authRepository.findActiveAdminSessionById = originalFindSession;
  authRepository.findAdminById = originalFindAdmin;
  authRepository.updateSessionLastActive = originalTouch;
});

test("admin without permission is denied by requirePermission middleware", async () => {
  const denied = await invoke(requirePermission("user:delete"), {
    admin: { id: "support-1", role: ADMIN_ROLES.SUPPORT_EXECUTIVE },
  });
  assert.equal(denied.error.statusCode, 403);

  const exportDenied = await invoke(requirePermission("user:export"), {
    admin: { id: "support-1", role: ADMIN_ROLES.SUPPORT_EXECUTIVE },
  });
  assert.equal(exportDenied.error.statusCode, 403);

  const missingAuth = await invoke(requirePermission("dashboard:view"), {});
  assert.equal(missingAuth.error.statusCode, 403);
});

test("user A cannot access user B ride fare audits; assigned driver can", () => {
  const ride = {
    id: "ride-1",
    userId: "user-a",
    driver: { user: { id: "driver-a" } },
  };

  assert.equal(canAccessRideFareAudit(ride, "user-a"), true);
  assert.equal(canAccessRideFareAudit(ride, "driver-a"), true);
  assert.equal(canAccessRideFareAudit(ride, "user-b"), false);
  assert.equal(canAccessRideFareAudit(ride, "driver-b"), false);
});

test("default role matrix keeps support away from user export and delete", () => {
  assert.equal(matrix.SUPPORT_EXECUTIVE.includes("user:export"), false);
  assert.equal(matrix.SUPPORT_EXECUTIVE.includes("user:delete"), false);
  assert.equal(matrix.SUPPORT_EXECUTIVE.includes("user:manage"), true);
});

test("every admin router endpoint is authenticated and RBAC-protected except public auth", () => {
  const adminDir = path.join(__dirname, "..", "src", "routes", "admin");
  const files = fs.readdirSync(adminDir).filter((file) => file.endsWith(".routes.js"));

  const publicAuthRoutes = new Set([
    "POST /login",
    "POST /login/mfa",
    "POST /refresh",
    "POST /forgot-password",
    "POST /reset-password",
  ]);
  const authenticatedSelfService = new Set([
    "POST /logout",
    "POST /change-password",
    "POST /2fa/setup",
    "POST /2fa/confirm",
    "POST /2fa/disable",
  ]);

  let total = 0;

  for (const file of files) {
    const router = require(path.join(adminDir, file));
    const routes = collectRoutes(router);
    assert.ok(routes.length > 0, `${file} should export routes`);
    total += routes.length;

    for (const route of routes) {
      const key = `${route.method} ${route.path}`;
      const hasAuth = route.routerAuth || route.names.includes("adminAuthMiddleware");
      const hasRbac = route.names.includes("requirePermissionMiddleware");

      if (file === "adminAuth.routes.js" && publicAuthRoutes.has(key)) {
        assert.equal(hasAuth, false, `${file} ${key} should stay public`);
        continue;
      }

      assert.equal(hasAuth, true, `${file} ${key} is missing adminAuthMiddleware`);

      if (file === "adminAuth.routes.js" && authenticatedSelfService.has(key)) {
        continue;
      }

      assert.equal(hasRbac, true, `${file} ${key} is missing requirePermission`);
    }
  }

  assert.ok(total >= 100, `expected a full admin route inventory, found ${total}`);
});

test("legacy driver approval no longer accepts a normal user token", async () => {
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-boundary";
  process.env.JWT_ISSUER = "goride";
  process.env.JWT_AUDIENCE = "goride-api";

  const driverRoutes = require("../src/routes/driver.routes");
  const approval = collectRoutes(driverRoutes).find(
    (route) => route.path === "/:driverId/status" && route.method === "PATCH",
  );

  assert.ok(approval);
  assert.equal(approval.names.includes("authenticate"), false);
  assert.equal(approval.names.includes("adminAuthMiddleware"), true);
  assert.equal(approval.names.includes("requirePermissionMiddleware"), true);

  const userToken = jwt.sign(
    { id: "user-a", role: "ADMIN", tokenType: "access" },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    },
  );

  const denied = await invoke(adminAuthMiddleware, {
    headers: { authorization: `Bearer ${userToken}` },
  });
  assert.equal(denied.error.statusCode, 401);
});

test("ownership: User A cannot cancel User B's ride", async () => {
  const rideRepository = require("../src/repositories/ride.repository");
  const { cancelRide } = require("../src/services/ride.service");
  const { UnauthorizedError } = require("../src/utils/AppError");

  const originalGetRideById = rideRepository.getRideById;
  rideRepository.getRideById = async (id) => ({
    id,
    userId: "user-owner",
    status: "REQUESTED",
  });

  try {
    await assert.rejects(
      () => cancelRide("ride-1", "user-attacker"),
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  } finally {
    rideRepository.getRideById = originalGetRideById;
  }
});

test("ownership: Driver A cannot update Driver B's ride status", async () => {
  const rideRepository = require("../src/repositories/ride.repository");
  const { updateRideStatus } = require("../src/services/ride.service");
  const { UnauthorizedError } = require("../src/utils/AppError");

  const originalGetRideById = rideRepository.getRideById;
  rideRepository.getRideById = async (id) => ({
    id,
    driverId: "driver-assigned",
    status: "ACCEPTED",
  });

  try {
    await assert.rejects(
      () => updateRideStatus("ride-1", "driver-attacker", "ARRIVED"),
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  } finally {
    rideRepository.getRideById = originalGetRideById;
  }
});

test("ownership: User A cannot submit a review for User B's ride", async () => {
  const rideRepository = require("../src/repositories/ride.repository");
  const { createReview } = require("../src/services/rideReview.service");
  const { ForbiddenError } = require("../src/utils/AppError");

  const originalGetRideById = rideRepository.getRideById;
  rideRepository.getRideById = async (id) => ({
    id,
    userId: "user-owner",
    driverId: "driver-1",
    status: "COMPLETED",
  });

  try {
    await assert.rejects(
      () =>
        createReview({
          rideId: "ride-1",
          userId: "user-attacker",
          rating: 5,
          review: "Great ride",
        }),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err instanceof ForbiddenError);
        return true;
      },
    );
  } finally {
    rideRepository.getRideById = originalGetRideById;
  }
});

test("ownership: User A cannot access User B's ride payment", async () => {
  const paymentRepository = require("../src/repositories/payment.repository");
  const { getPaymentByRide } = require("../src/services/payment.service");
  const { ForbiddenError } = require("../src/utils/AppError");

  const originalGetPaymentByRideId = paymentRepository.getPaymentByRideId;
  paymentRepository.getPaymentByRideId = async (rideId) => ({
    id: "payment-1",
    rideId,
    userId: "user-owner",
    amount: 150,
  });

  try {
    await assert.rejects(
      () => getPaymentByRide("ride-1", { id: "user-attacker", role: "USER" }),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err instanceof ForbiddenError);
        return true;
      },
    );
  } finally {
    paymentRepository.getPaymentByRideId = originalGetPaymentByRideId;
  }
});

test("ownership: User A cannot modify or delete User B's notification", async () => {
  const notificationRepository = require("../src/repositories/notification.repository");
  const { markAsRead, deleteNotification } = require("../src/services/notification.service");
  const { ForbiddenError } = require("../src/utils/AppError");

  const originalFind = notificationRepository.findNotificationById;
  notificationRepository.findNotificationById = async (id) => ({
    id,
    userId: "user-owner",
    isRead: false,
  });

  try {
    await assert.rejects(
      () => markAsRead("notif-1", "user-attacker"),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err instanceof ForbiddenError);
        return true;
      },
    );

    await assert.rejects(
      () => deleteNotification("notif-1", "user-attacker"),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err instanceof ForbiddenError);
        return true;
      },
    );
  } finally {
    notificationRepository.findNotificationById = originalFind;
  }
});

test("ownership: User A cannot apply a coupon to User B's ride", async () => {
  const rideRepository = require("../src/repositories/ride.repository");
  const { applyCoupon } = require("../src/services/coupon.service");
  const { BadRequestError } = require("../src/utils/AppError");

  const originalGetRideById = rideRepository.getRideById;
  rideRepository.getRideById = async (id) => ({
    id,
    userId: "user-owner",
    status: "REQUESTED",
    couponId: null,
    finalFare: 100,
    estimatedFare: 100,
  });

  try {
    await assert.rejects(
      () => applyCoupon({ code: "DISCOUNT10", rideId: "ride-1", userId: "user-attacker" }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /not allowed to apply/i);
        return true;
      },
    );
  } finally {
    rideRepository.getRideById = originalGetRideById;
  }
});

test.after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalIssuer === undefined) delete process.env.JWT_ISSUER;
  else process.env.JWT_ISSUER = originalIssuer;
  if (originalAudience === undefined) delete process.env.JWT_AUDIENCE;
  else process.env.JWT_AUDIENCE = originalAudience;
});

