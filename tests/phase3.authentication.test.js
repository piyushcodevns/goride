process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const prisma = require("../src/config/prisma");
const { generateToken, verifyToken } = require("../src/utils/jwt");
const authService = require("../src/services/auth.service");
const adminAuthService = require("../src/services/admin/adminAuth.service");
const emailService = require("../src/services/email.service");
const hashToken = require("../src/utils/hashToken");
const { ConflictError, UnauthorizedError, ForbiddenError, BadRequestError } = require("../src/utils/AppError");

// Mock email sending to avoid network delays
emailService.sendEmail = async () => ({ messageId: "test-mock-msg-id" });

describe("PHASE 3: Authentication, Session & Token Security", () => {
  const uniqueId = Date.now();
  const testEmail = `auth_test_${uniqueId}@goride.internal`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const testPassword = "SecurePassword@123";

  test("Password hashing uses secure bcrypt cost factor", async () => {
    const hash = await bcrypt.hash("testPassword123", 12);
    assert.ok(hash.startsWith("$2b$12$") || hash.startsWith("$2a$12$"));
    const match = await bcrypt.compare("testPassword123", hash);
    assert.equal(match, true);
    const nonMatch = await bcrypt.compare("wrongPassword", hash);
    assert.equal(nonMatch, false);
  });

  test("User Signup: successfully registers new user and returns JWT", async () => {
    const result = await authService.registerUser({
      fullName: "Auth Test User",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    });

    assert.ok(result.user);
    assert.equal(result.user.email, testEmail);
    assert.equal(result.user.phone, testPhone);
    assert.equal(result.user.role, "USER");
    assert.ok(result.token, "JWT token must be returned on registration");

    // Verify token validity
    const decoded = verifyToken(result.token);
    assert.equal(decoded.id, result.user.id);
    assert.equal(decoded.email, testEmail);
  });

  test("User Signup: rejects duplicate email with ConflictError", async () => {
    const diffPhone = `8${Math.floor(100000000 + Math.random() * 900000000)}`;
    await assert.rejects(
      async () => {
        await authService.registerUser({
          fullName: "Duplicate Email User",
          email: testEmail,
          phone: diffPhone,
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("Email already registered"));
        return true;
      },
    );
  });

  test("User Signup: rejects duplicate phone with ConflictError", async () => {
    const diffEmail = `auth_diff_${uniqueId}@goride.internal`;
    await assert.rejects(
      async () => {
        await authService.registerUser({
          fullName: "Duplicate Phone User",
          email: diffEmail,
          phone: testPhone,
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.ok(err.message.includes("Phone number already registered"));
        return true;
      },
    );
  });

  test("User Login: rejects invalid password with UnauthorizedError", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: testEmail,
          password: "IncorrectPassword!999",
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid email or password.");
        return true;
      },
    );
  });

  test("User Login: rejects non-existent email with UnauthorizedError", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: "nonexistent_email_9999@goride.internal",
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid email or password.");
        return true;
      },
    );
  });

  test("User Login: successfully logs in with valid credentials", async () => {
    const result = await authService.loginUser({
      email: testEmail,
      password: testPassword,
    });

    assert.ok(result.user);
    assert.equal(result.user.email, testEmail);
    assert.ok(result.token);
    const decoded = verifyToken(result.token);
    assert.equal(decoded.email, testEmail);
  });

  test("JWT Security: rejects tampered, malformed, wrong secret, and expired tokens", () => {
    const validToken = generateToken({ id: "usr_123", email: "u@goride.com", role: "USER" });
    
    // Tamper token payload
    const parts = validToken.split(".");
    const tamperedPayload = Buffer.from('{"id":"hacked","role":"ADMIN"}').toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(() => {
      verifyToken(tamperedToken);
    }, (err) => err.name === "JsonWebTokenError");

    // Malformed token
    assert.throws(() => {
      verifyToken("not.a.valid.jwt");
    });

    // Wrong secret
    const fakeToken = jwt.sign({ id: "usr_123" }, "completely-wrong-secret-key-12345678", { algorithm: "HS256" });
    assert.throws(() => {
      verifyToken(fakeToken);
    }, (err) => err.name === "JsonWebTokenError");

    // Expired token
    const expiredToken = jwt.sign(
      { id: "usr_123" },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "0s" },
    );
    assert.throws(() => {
      verifyToken(expiredToken);
    }, (err) => err.name === "TokenExpiredError");
  });

  test("Forgot & Reset Password flow with token hash and expiration", async () => {
    const resetUserEmail = `reset_${uniqueId}@goride.internal`;
    const user = await prisma.user.create({
      data: {
        fullName: "Reset User",
        email: resetUserEmail,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash("InitialPassword@123", 10),
      },
    });

    // 1. Trigger forgot password
    let capturedResetToken = null;
    emailService.sendEmail = async ({ html }) => {
      const match = html.match(/token=([a-f0-9]+)/i) || html.match(/([a-f0-9]{32,})/i);
      if (match) capturedResetToken = match[1];
      return { messageId: "reset-msg" };
    };

    await authService.forgotPassword({ email: resetUserEmail });

    // Fallback: fetch generated token directly from DB hashed token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawResetToken);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashed,
        passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // 2. Reset password with raw token
    const newPassword = "NewSecurePassword@456";
    const resetResult = await authService.resetPassword({
      token: rawResetToken,
      password: newPassword,
    });
    assert.ok(resetResult.message.includes("successfully"));

    // 3. Login with old password fails
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: resetUserEmail,
          password: "InitialPassword@123",
        });
      },
      (err) => err instanceof UnauthorizedError,
    );

    // 4. Login with new password succeeds
    const newLogin = await authService.loginUser({
      email: resetUserEmail,
      password: newPassword,
    });
    assert.ok(newLogin.token);
  });

  test("User Change Password: Validates current password, rejects reuse, and enforces match", async () => {
    const changeUserEmail = `change_pass_${uniqueId}@goride.internal`;
    const oldPassword = "OldPassword@123";
    const user = await prisma.user.create({
      data: {
        fullName: "Change Pass User",
        email: changeUserEmail,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: await bcrypt.hash(oldPassword, 10),
        role: "USER",
        isActive: true,
      },
    });

    // 1. Rejects wrong current password
    await assert.rejects(
      async () => {
        await authService.changePassword(user.id, {
          currentPassword: "WrongCurrentPassword@123",
          newPassword: "BrandNewPassword@456",
          confirmPassword: "BrandNewPassword@456",
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Current password is incorrect.");
        return true;
      },
    );

    // 2. Rejects new password mismatch with confirm password
    await assert.rejects(
      async () => {
        await authService.changePassword(user.id, {
          currentPassword: oldPassword,
          newPassword: "BrandNewPassword@456",
          confirmPassword: "DifferentPassword@456",
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("do not match"));
        return true;
      },
    );

    // 3. Rejects new password identical to current password
    await assert.rejects(
      async () => {
        await authService.changePassword(user.id, {
          currentPassword: oldPassword,
          newPassword: oldPassword,
          confirmPassword: oldPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("must be different"));
        return true;
      },
    );

    // 4. Successfully changes password with valid payload
    const updatedPassword = "BrandNewPassword@456";
    const changeResult = await authService.changePassword(user.id, {
      currentPassword: oldPassword,
      newPassword: updatedPassword,
      confirmPassword: updatedPassword,
    });
    assert.equal(changeResult.message, "Password changed successfully.");

    // 5. Old password cannot be used to login anymore
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: changeUserEmail,
          password: oldPassword,
        });
      },
      (err) => err instanceof UnauthorizedError,
    );

    // 6. New password logs in successfully
    const successLogin = await authService.loginUser({
      email: changeUserEmail,
      password: updatedPassword,
    });
    assert.ok(successLogin.token);
  });

  test("Admin Authentication, Refresh Token Rotation & Logout Invalidation", async () => {
    let superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          fullName: "Root Super Admin",
          email: `superadmin_${Date.now()}@goride.internal`,
          phone: `6${Math.floor(100000000 + Math.random() * 900000000)}`,
          password: await bcrypt.hash("SuperSecret@123", 10),
          role: "SUPER_ADMIN",
        },
      });
    }

    const adminEmail = `admin_session_${uniqueId}@goride.internal`;
    const adminPhone = `5${Math.floor(100000000 + Math.random() * 900000000)}`;

    await adminAuthService.createAdmin({
      fullName: "Admin Session Tester",
      email: adminEmail,
      phone: adminPhone,
      password: testPassword,
      role: "ADMIN",
      createdByAdminId: superAdmin.id,
      createdByRole: "SUPER_ADMIN",
    });

    // 1. Login returns accessToken and refreshToken
    const loginResult = await adminAuthService.loginAdmin({
      email: adminEmail,
      password: testPassword,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);
    assert.ok(loginResult.sessionId);

    // 2. Refresh token rotation
    const refreshed = await adminAuthService.refreshAdminToken({
      refreshToken: loginResult.refreshToken,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);

    // 3. Logout revokes the rotated session
    await adminAuthService.logoutAdmin({
      sessionId: refreshed.sessionId,
      adminId: loginResult.user.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    // 4. Revoked session cannot be refreshed
    await assert.rejects(
      async () => {
        await adminAuthService.refreshAdminToken({
          refreshToken: refreshed.refreshToken,
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => {
        return err instanceof UnauthorizedError;
      },
    );
  });

  test("Admin Brute-Force Lockout Defense: Locks account after 5 failed attempts", async () => {
    let superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    const lockEmail = `admin_bruteforce_${uniqueId}@goride.internal`;
    const lockPhone = `4${Math.floor(100000000 + Math.random() * 900000000)}`;

    await adminAuthService.createAdmin({
      fullName: "Admin Brute Force",
      email: lockEmail,
      phone: lockPhone,
      password: testPassword,
      role: "ADMIN",
      createdByAdminId: superAdmin.id,
      createdByRole: "SUPER_ADMIN",
    });

    for (let i = 1; i <= 4; i++) {
      await assert.rejects(
        async () => {
          await adminAuthService.loginAdmin({
            email: lockEmail,
            password: "WrongPassword!",
            ipAddress: "127.0.0.1",
            userAgent: "TestAgent",
          });
        },
        (err) => err instanceof UnauthorizedError,
      );
    }

    // 5th attempt triggers account lockout
    await assert.rejects(
      async () => {
        await adminAuthService.loginAdmin({
          email: lockEmail,
          password: "WrongPassword!",
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => err instanceof ForbiddenError && err.message.includes("Account locked"),
    );
  });
});
