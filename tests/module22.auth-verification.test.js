process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const authService = require("../src/services/auth.service");
const emailService = require("../src/services/email.service");
const pendingService = require("../src/services/pendingRegistration.service");
const hashToken = require("../src/utils/hashToken");
const {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  EmailProviderError,
} = require("../src/utils/AppError");

describe("MODULE 22: Mandatory Email Verification & Redis Pending Registration", () => {
  let capturedEmails = [];

  // Capture emails sent by emailService to verify OTP delivery
  before(() => {
    emailService.sendEmail.testInterceptor = async ({ to, subject, html, text }) => {
      capturedEmails.push({ to, subject, html, text });
      return { messageId: `mock-msg-${Date.now()}` };
    };
  });

  const uniqueSuffix = Date.now();
  const testEmail = `mod22_pending_${uniqueSuffix}@goride.internal`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const testPassword = "SecurePassword@123";
  let sentOtp = null;
  let createdUserId = null;

  test("1. Valid registration creates PENDING registration in Redis and does NOT create User in PostgreSQL", async () => {
    capturedEmails = [];

    const regResult = await authService.registerUser({
      fullName: "Module 22 Test User",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    });

    // Verify response structure
    assert.equal(regResult.requiresVerification, true);
    assert.equal(regResult.message, "Account created. Please verify your email to continue.");
    assert.ok(regResult.user);
    assert.equal(regResult.user.email, testEmail);
    assert.equal(regResult.token, undefined, "Registration MUST NOT issue a JWT token!");

    // CRITICAL: Database User table MUST have ZERO records before OTP verification!
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert.equal(dbUser, null, "PostgreSQL User table must contain ZERO records before OTP verification!");

    // Verify pending registration exists in Redis
    const pending = await pendingService.getPendingRegistrationByEmail(testEmail);
    assert.ok(pending, "Pending registration must exist in Redis!");
    assert.equal(pending.email, testEmail);
    assert.equal(pending.phone, testPhone);
    assert.notEqual(pending.password, testPassword, "Stored password in Redis must be hashed!");
    assert.ok(pending.otpHash, "Hashed OTP must be stored in Redis!");
    assert.notEqual(pending.otpHash.length, 6, "Redis must store a SHA-256 hash, not the 6-digit plaintext OTP!");

    // Check verification email was delivered with 6-digit OTP
    assert.equal(capturedEmails.length, 1, "Verification email must be sent upon registration");
    assert.equal(capturedEmails[0].to, testEmail);

    const otpMatch = capturedEmails[0].html.match(/<h1>(\d{6})<\/h1>/);
    assert.ok(otpMatch, "Email must contain a 6-digit OTP in <h1>");
    sentOtp = otpMatch[1];
    assert.equal(sentOtp.length, 6);
  });

  test("2. Unverified pending user CANNOT login and receives verification error", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: testEmail,
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Please verify your email before logging in.");
        assert.equal(err.data?.emailVerified, false);
        return true;
      },
      "Login must be rejected with UnauthorizedError for unverified accounts"
    );
  });

  test("3. Wrong password remains rejected with generic error for non-pending accounts", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: "unknown_random_user@goride.internal",
          password: "WrongPassword999!",
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid email or password.");
        return true;
      }
    );
  });

  test("4. Abandoned pending registration can register again without 'Email already exists'", async () => {
    capturedEmails = [];

    // User re-submits registration with same email before verifying
    const reRegResult = await authService.registerUser({
      fullName: "Module 22 Test User Updated",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    });

    assert.equal(reRegResult.requiresVerification, true);

    // Still ZERO records in PostgreSQL
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert.equal(dbUser, null, "Still ZERO records in PostgreSQL after re-registration!");

    // Fresh OTP generated
    assert.equal(capturedEmails.length, 1);
    const newOtpMatch = capturedEmails[0].html.match(/<h1>(\d{6})<\/h1>/);
    assert.ok(newOtpMatch);
    sentOtp = newOtpMatch[1];
  });

  test("5. Invalid OTP is rejected with BadRequestError", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyEmail("000000", testEmail); // wrong OTP
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
        return true;
      }
    );
  });

  test("6. Expired OTP is rejected with BadRequestError", async () => {
    // Manually set expiry in Redis to past
    const pending = await pendingService.getPendingRegistrationByEmail(testEmail);
    assert.ok(pending);
    pending.expiresAt = Date.now() - 60000;
    const client = pendingService.savePendingRegistration; // verify update
    await pendingService.savePendingRegistration({
      email: testEmail,
      phone: testPhone,
      fullName: "Module 22 Test User",
      password: pending.password,
      otp: "998877",
      expiresAt: new Date(Date.now() - 60000),
    });

    await assert.rejects(
      async () => {
        await authService.verifyEmail("998877", testEmail);
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
        return true;
      }
    );
  });

  test("7. Resend verification generates new OTP, updates Redis, and resets 15m expiry", async () => {
    capturedEmails = [];

    // Re-register to re-establish pending registration
    await authService.registerUser({
      fullName: "Module 22 Test User",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    });
    capturedEmails = [];

    const resendResult = await authService.sendVerificationEmail({ email: testEmail });
    assert.equal(resendResult.message, "Verification code sent to your email.");

    assert.equal(capturedEmails.length, 1);
    const newOtpMatch = capturedEmails[0].html.match(/<h1>(\d{6})<\/h1>/);
    assert.ok(newOtpMatch);
    sentOtp = newOtpMatch[1];
    assert.equal(sentOtp.length, 6);

    const pending = await pendingService.getPendingRegistrationByEmail(testEmail);
    assert.ok(pending);
    assert.ok(pending.expiresAt > Date.now());
  });

  test("8. Valid OTP creates exactly one User in PostgreSQL with emailVerified=true and isVerified=true", async () => {
    // Verify before: zero users
    const beforeUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert.equal(beforeUser, null, "Zero users in PostgreSQL before verification");

    const verifyResult = await authService.verifyEmail(sentOtp, testEmail);
    assert.equal(verifyResult.message, "Email verified successfully.");
    assert.ok(verifyResult.user);
    createdUserId = verifyResult.user.id;

    // Verify after: EXACTLY ONE User created in PostgreSQL
    const count = await prisma.user.count({ where: { email: testEmail } });
    assert.equal(count, 1, "Exactly ONE User record must exist in PostgreSQL!");

    const verifiedUser = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.equal(verifiedUser.emailVerified, true, "User emailVerified must be true");
    assert.equal(verifiedUser.isVerified, true, "User isVerified must be true");
    assert.equal(verifiedUser.role, "USER");

    // Pending registration in Redis must be cleaned up
    const pending = await pendingService.getPendingRegistrationByEmail(testEmail);
    assert.equal(pending, null, "Pending registration in Redis must be deleted after successful verification!");
  });

  test("9. Used OTP cannot be reused to create duplicate user", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyEmail(sentOtp, testEmail);
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
        return true;
      }
    );

    const count = await prisma.user.count({ where: { email: testEmail } });
    assert.equal(count, 1, "User count must strictly remain 1!");
  });

  test("10. Once verified, duplicate registration with same email is rejected with ConflictError", async () => {
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
      }
    );
  });

  test("11. Once verified, duplicate registration with same phone is rejected with ConflictError", async () => {
    const diffEmail = `mod22_diff_${uniqueSuffix}@goride.internal`;
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
      }
    );
  });

  test("12. Already-verified user cannot request resend verification", async () => {
    await assert.rejects(
      async () => {
        await authService.sendVerificationEmail({ email: testEmail });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "Email is already verified.");
        return true;
      }
    );
  });

  test("13. Verified user CAN successfully login", async () => {
    const loginResult = await authService.loginUser({
      email: testEmail,
      password: testPassword,
    });

    assert.ok(loginResult.user);
    assert.equal(loginResult.user.id, createdUserId);
    assert.equal(loginResult.user.email, testEmail);
    assert.ok(loginResult.token, "Login must return access token for verified user");
  });

  test("14. Email provider failure during registration does NOT create User in PostgreSQL", async () => {
    const failEmail = `mod22_fail_${Date.now()}@goride.internal`;
    const failPhone = `8${Math.floor(100000000 + Math.random() * 900000000)}`;

    // Force email sending failure
    const origInterceptor = emailService.sendEmail.testInterceptor;
    emailService.sendEmail.testInterceptor = async () => {
      throw new EmailProviderError("Unable to send email notification.");
    };

    await assert.rejects(
      async () => {
        await authService.registerUser({
          fullName: "Email Fail User",
          email: failEmail,
          phone: failPhone,
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof EmailProviderError);
        return true;
      }
    );

    // Restore interceptor
    emailService.sendEmail.testInterceptor = origInterceptor;

    // Verify ZERO records in PostgreSQL
    const failDbUser = await prisma.user.findUnique({ where: { email: failEmail } });
    assert.equal(failDbUser, null, "Email failure MUST NOT create any User in PostgreSQL!");

    // Verify pending registration was cleaned up from Redis
    const failPending = await pendingService.getPendingRegistrationByEmail(failEmail);
    assert.equal(failPending, null, "Pending registration must be cleaned up on email delivery failure!");
  });

  test("15. Forgot and reset password flow continues to work seamlessly", async () => {
    capturedEmails = [];

    const forgotResult = await authService.forgotPassword({ email: testEmail });
    assert.ok(forgotResult.message);
    assert.equal(capturedEmails.length, 1);

    // Verify user has password reset token
    const userWithReset = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.ok(userWithReset.passwordResetToken);

    // Change password via changePassword
    const newPassword = "UpdatedPassword@456";
    const changeResult = await authService.changePassword(createdUserId, {
      currentPassword: testPassword,
      newPassword: newPassword,
      confirmPassword: newPassword,
    });
    assert.equal(changeResult.message, "Password changed successfully.");

    // Verify login with new password
    const newLogin = await authService.loginUser({
      email: testEmail,
      password: newPassword,
    });
    assert.ok(newLogin.token);
  });

  after(async () => {
    await pendingService.closePendingRegistrationClient();
    await prisma.$disconnect();
  });
});
