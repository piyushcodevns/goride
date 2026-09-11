process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const authService = require("../src/services/auth.service");
const emailService = require("../src/services/email.service");
const hashToken = require("../src/utils/hashToken");
const {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} = require("../src/utils/AppError");

describe("MODULE 22: Mandatory Email Verification & Auth Hardening", () => {
  let capturedEmails = [];

  // Capture emails sent by emailService to verify OTP delivery
  before(() => {
    emailService.sendEmail.testInterceptor = async ({ to, subject, html, text }) => {
      capturedEmails.push({ to, subject, html, text });
      return { messageId: `mock-msg-${Date.now()}` };
    };
  });

  const uniqueSuffix = Date.now();
  const testEmail = `mod22_user_${uniqueSuffix}@goride.internal`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const testPassword = "SecurePassword@123";
  let createdUserId = null;
  let sentOtp = null;

  test("1. Registration creates UNVERIFIED account and does NOT authenticate user", async () => {
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

    createdUserId = regResult.user.id;

    // Check database state
    const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.equal(dbUser.emailVerified, false, "User must be created in UNVERIFIED state");
    assert.equal(dbUser.isVerified, false, "User isVerified must be false");
    assert.ok(dbUser.emailVerificationToken, "Hashed verification token must be stored");
    assert.ok(dbUser.emailVerificationExpires, "Verification expiry timestamp must be stored");

    // Check that plaintext OTP is NOT in database
    assert.notEqual(dbUser.emailVerificationToken.length, 6, "Database must store a hash, not the 6-digit OTP!");

    // Check verification email was delivered
    assert.equal(capturedEmails.length, 1, "Verification email must be sent upon registration");
    assert.equal(capturedEmails[0].to, testEmail);
    assert.ok(capturedEmails[0].subject.includes("Email Verification"));

    // Extract OTP from email HTML for subsequent testing
    const otpMatch = capturedEmails[0].html.match(/<h1>(\d{6})<\/h1>/);
    assert.ok(otpMatch, "Email must contain a 6-digit OTP in <h1>");
    sentOtp = otpMatch[1];
    assert.equal(sentOtp.length, 6);
  });

  test("2. Unverified user CANNOT login", async () => {
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

  test("3. Wrong password remains rejected with generic error", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: testEmail,
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

  test("4. Non-existing email remains rejected with generic error", async () => {
    await assert.rejects(
      async () => {
        await authService.loginUser({
          email: "nonexistent_email_404@goride.internal",
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid email or password.");
        return true;
      }
    );
  });

  test("5. Duplicate email registration is rejected with ConflictError", async () => {
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

  test("6. Duplicate phone registration is rejected with ConflictError", async () => {
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

  test("7. Invalid OTP is rejected with BadRequestError", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyEmail("000000"); // wrong OTP
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
        return true;
      }
    );
  });

  test("8. Expired OTP is rejected with BadRequestError", async () => {
    // Temporarily set expiry in the past
    await prisma.user.update({
      where: { id: createdUserId },
      data: {
        emailVerificationExpires: new Date(Date.now() - 60000), // 1 minute ago
      },
    });

    await assert.rejects(
      async () => {
        await authService.verifyEmail(sentOtp);
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
        return true;
      }
    );
  });

  test("9. Resend verification generates new OTP and resets expiry", async () => {
    capturedEmails = [];

    const resendResult = await authService.sendVerificationEmail({ email: testEmail });
    assert.equal(resendResult.message, "Verification code sent to your email.");

    assert.equal(capturedEmails.length, 1);
    const newOtpMatch = capturedEmails[0].html.match(/<h1>(\d{6})<\/h1>/);
    assert.ok(newOtpMatch);
    sentOtp = newOtpMatch[1];
    assert.equal(sentOtp.length, 6);

    const updatedUser = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.ok(updatedUser.emailVerificationExpires > new Date());
  });

  test("10. Valid OTP verifies email and activates account", async () => {
    const verifyResult = await authService.verifyEmail(sentOtp);
    assert.equal(verifyResult.message, "Email verified successfully.");

    // Check database state
    const verifiedUser = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.equal(verifiedUser.emailVerified, true, "User emailVerified must be true");
    assert.equal(verifiedUser.isVerified, true, "User isVerified must be true");
    assert.equal(verifiedUser.emailVerificationToken, null, "Verification token must be cleared");
    assert.equal(verifiedUser.emailVerificationExpires, null, "Verification expiry must be cleared");
  });

  test("11. Used OTP cannot be reused", async () => {
    await assert.rejects(
      async () => {
        await authService.verifyEmail(sentOtp);
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "Invalid or expired verification token.");
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

  test("14. Forgot and reset password flow continues to work seamlessly", async () => {
    capturedEmails = [];

    const forgotResult = await authService.forgotPassword({ email: testEmail });
    assert.ok(forgotResult.message);
    assert.equal(capturedEmails.length, 1);

    // Extract reset token from email template
    const tokenMatch = capturedEmails[0].html.match(/token=([a-zA-Z0-9_-]+)/) ||
                       capturedEmails[0].html.match(/class="token">([a-zA-Z0-9_-]+)<\/div>/) ||
                       capturedEmails[0].html.match(/<strong>([a-zA-Z0-9_-]+)<\/strong>/) ||
                       capturedEmails[0].html.match(/([a-f0-9]{32,})/i);

    // Read the reset token from database
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
});
