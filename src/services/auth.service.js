const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");

const {
  passwordResetTemplate,
} = require("../templates/email/password-reset.template");

const {
  emailVerificationTemplate,
} = require("../templates/email/email-verification.template");

const logger = require("../utils/logger");

const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require("../utils/AppError");

const {
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserById,
  findUserByPhone,
  findUserByResetToken,
  findUserByEmailVerificationToken,

  findUserByIdWithPassword,
  changeUserPassword,

  savePasswordResetToken,
  saveEmailVerificationToken,
  updatePassword,
  verifyUserEmail,
} = require("../repositories/auth.repository");

const {
  savePendingRegistration,
  getPendingRegistrationByEmail,
  getPendingRegistrationByOtp,
  updatePendingOtp,
  incrementPendingAttempts,
  deletePendingRegistration,
} = require("./pendingRegistration.service");

const generateResetToken = require("../utils/generateToken");
const hashToken = require("../utils/hashToken");
const generateOTP = require("../utils/generateOTP");
const { generateToken } = require("../utils/jwt");
const { sendEmail } = require("./email.service");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} = require("../validators/auth.validator");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ================= REGISTER =================

const registerUser = async (userData) => {
  const validatedData = registerSchema.parse(userData);
  const normalizedEmail = validatedData.email.trim().toLowerCase();
  const normalizedPhone = validatedData.phone.trim();

  // Check existing VERIFIED/REAL User conflicts in PostgreSQL
  const existingEmailUser = await findUserByEmail(normalizedEmail);
  if (existingEmailUser) {
    if (existingEmailUser.emailVerified) {
      throw new ConflictError("Email already registered. This email already exists.");
    } else {
      // Clean up legacy unverified user row from PostgreSQL so they are not blocked
      try {
        await prisma.user.delete({ where: { id: existingEmailUser.id } });
      } catch (delErr) {
        logger.warn("Could not clean up legacy unverified user by email.", {
          error: delErr?.message,
        });
      }
    }
  }

  const existingPhoneUser = await findUserByPhone(normalizedPhone);
  if (existingPhoneUser) {
    if (existingPhoneUser.emailVerified) {
      throw new ConflictError("Phone number already registered. This phone number already exists.");
    } else {
      try {
        await prisma.user.delete({ where: { id: existingPhoneUser.id } });
      } catch (delErr) {
        logger.warn("Could not clean up legacy unverified user by phone.", {
          error: delErr?.message,
        });
      }
    }
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

  // Generate 6-digit OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Store in Redis pending registration (Zero records created in PostgreSQL!)
  await savePendingRegistration({
    email: normalizedEmail,
    phone: normalizedPhone,
    fullName: validatedData.fullName,
    password: hashedPassword,
    otp,
    expiresAt,
  });

  // Send verification email with OTP
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "GoRide Email Verification",
      html: emailVerificationTemplate({ otp }),
    });
  } catch (emailErr) {
    // If email delivery fails:
    // 1. Do NOT create PostgreSQL User (already zero records in PostgreSQL)
    // 2. Clean up pending registration from Redis
    await deletePendingRegistration(normalizedEmail, hashToken(otp));
    logger.error("Failed to send verification email during registration.", {
      email: normalizedEmail,
      error: emailErr.message,
    });
    throw emailErr;
  }

  logger.info("Registration pending verification OTP sent.", {
    email: normalizedEmail,
  });

  return {
    message: "Account created. Please verify your email to continue.",
    user: {
      fullName: validatedData.fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: "USER",
    },
    requiresVerification: true,
  };
};

// ================= LOGIN =================

const loginUser = async (userData) => {
  const validatedData = loginSchema.parse(userData);

  const { email, password } = validatedData;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmailWithPassword(normalizedEmail);

  if (!user || !user.password) {
    // Check if there is an unverified pending registration in Redis
    const pending = await getPendingRegistrationByEmail(normalizedEmail);
    if (pending) {
      const error = new UnauthorizedError("Please verify your email before logging in.");
      error.data = { emailVerified: false, email: normalizedEmail };
      throw error;
    }
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (user.deletedAt || user.isBlocked || user.isActive === false) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (!user.emailVerified) {
    const error = new UnauthorizedError("Please verify your email before logging in.");
    error.data = { emailVerified: false, email: user.email };
    throw error;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

// ================= FORGOT PASSWORD =================

const forgotPassword = async (userData) => {
  const { email } = forgotPasswordSchema.parse(userData);
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      message: "Verification code sent to your email.",
    };
  }

  const resetToken = generateResetToken();
  const hashedToken = hashToken(resetToken);

  const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await savePasswordResetToken(user.id, hashedToken, passwordResetExpires);

  await sendEmail({
    to: user.email,
    subject: "GoRide Password Reset",
    html: passwordResetTemplate({
      token: resetToken,
    }),
  });

  logger.info("Password reset email sent successfully.", {
    userId: user.id,
    email: user.email,
  });

  return {
    message: "Verification code sent to your email.",
  };
};

// ================= RESET PASSWORD =================

const resetPassword = async (userData) => {
  const { token, password, confirmPassword } =
    resetPasswordSchema.parse(userData);

  if (confirmPassword && password !== confirmPassword) {
    throw new BadRequestError(
      "New password and confirm password do not match.",
    );
  }

  const hashedToken = hashToken(token);

  const user = await findUserByResetToken(hashedToken);

  if (!user) {
    throw new BadRequestError("Invalid or expired reset token.");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  await updatePassword(user.id, hashedPassword);

  await notificationService.dispatchNotification(
    NotificationFactory.createPasswordResetNotification(user),
  );

  return {
    message: "Password reset successfully.",
  };
};

// ================= CHANGE PASSWORD =================

const changePassword = async (userId, passwordData) => {
  const { currentPassword, newPassword, confirmPassword } =
    changePasswordSchema.parse(passwordData);
  const user = await findUserByIdWithPassword(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new UnauthorizedError("Current password is incorrect.");
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError(
      "New password and confirm password do not match.",
    );
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password.",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await changeUserPassword(userId, hashedPassword);

  return {
    message: "Password changed successfully.",
  };
};

// ================= SEND VERIFICATION EMAIL / RESEND =================

const sendVerificationEmail = async (identifier) => {
  let email;
  if (typeof identifier === "object" && identifier !== null) {
    if (identifier.email) {
      email = identifier.email.trim().toLowerCase();
    } else if (identifier.userId) {
      const u = await findUserById(identifier.userId);
      email = u?.email;
    }
  } else if (typeof identifier === "string") {
    if (identifier.includes("@")) {
      email = identifier.trim().toLowerCase();
    } else {
      const u = await findUserById(identifier);
      email = u?.email;
    }
  }

  if (!email) {
    return {
      message: "Verification code sent to your email.",
    };
  }

  // 1. Check if user is already verified in PostgreSQL
  const existingUser = await findUserByEmail(email);
  if (existingUser && existingUser.emailVerified) {
    throw new ConflictError("Email is already verified.");
  }

  // 2. Check pending registration in Redis
  const pending = await getPendingRegistrationByEmail(email);
  if (pending) {
    const newOtp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await updatePendingOtp({
      email,
      newOtp,
      expiresAt,
    });

    await sendEmail({
      to: email,
      subject: "GoRide Email Verification",
      html: emailVerificationTemplate({ otp: newOtp }),
    });

    logger.info("Resend verification code sent to pending registration.", { email });

    return {
      message: "Verification code sent to your email.",
    };
  }

  // 3. Fallback: check legacy unverified user in PostgreSQL
  if (existingUser && !existingUser.emailVerified) {
    const newOtp = generateOTP();
    const hashedToken = hashToken(newOtp);
    const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    await saveEmailVerificationToken(
      existingUser.id,
      hashedToken,
      emailVerificationExpires,
    );

    await sendEmail({
      to: existingUser.email,
      subject: "GoRide Email Verification",
      html: emailVerificationTemplate({ otp: newOtp }),
    });

    logger.info("Resend verification code sent to legacy unverified user.", { email });

    return {
      message: "Verification code sent to your email.",
    };
  }

  // Anti-enumeration: If neither found, return standard message
  return {
    message: "Verification code sent to your email.",
  };
};

// ================= VERIFY EMAIL =================

const verifyEmail = async (otp, email = null) => {
  const { otp: validatedOtp } = verifyEmailSchema.parse({ otp });
  const hashedToken = hashToken(validatedOtp);

  let pending = null;
  const normalizedEmail = email ? email.trim().toLowerCase() : null;

  if (normalizedEmail) {
    pending = await getPendingRegistrationByEmail(normalizedEmail);
  }
  if (!pending) {
    pending = await getPendingRegistrationByOtp(validatedOtp);
  }

  if (pending) {
    if (pending.otpHash !== hashedToken) {
      await incrementPendingAttempts(pending.email);
      throw new BadRequestError("Invalid or expired verification token.");
    }

    if (pending.expiresAt && Number(pending.expiresAt) < Date.now()) {
      await deletePendingRegistration(pending.email, pending.otpHash);
      throw new BadRequestError("Invalid or expired verification token.");
    }

    // Atomic transaction: Re-check uniqueness and create User record in PostgreSQL
    const user = await prisma.$transaction(async (tx) => {
      const existingEmail = await tx.user.findUnique({
        where: { email: pending.email },
      });
      if (existingEmail) {
        if (existingEmail.emailVerified) {
          throw new ConflictError("Email already registered. This email already exists.");
        }
        await tx.user.delete({ where: { id: existingEmail.id } });
      }

      const existingPhone = await tx.user.findUnique({
        where: { phone: pending.phone },
      });
      if (existingPhone) {
        if (existingPhone.emailVerified) {
          throw new ConflictError("Phone number already registered. This phone number already exists.");
        }
        await tx.user.delete({ where: { id: existingPhone.id } });
      }

      return tx.user.create({
        data: {
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          password: pending.password,
          emailVerified: true,
          isVerified: true,
          role: "USER",
        },
      });
    });

    // Remove pending registration from Redis
    await deletePendingRegistration(pending.email, pending.otpHash);

    // Dispatch welcome notification
    try {
      await notificationService.dispatchNotification(
        NotificationFactory.createWelcomeNotification(user),
      );
    } catch (notifErr) {
      logger.warn("Could not dispatch welcome notification:", {
        error: notifErr?.message,
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info("User created and email verified successfully.", {
      userId: user.id,
      email: user.email,
    });

    return {
      message: "Email verified successfully.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  // Fallback for legacy unverified user in PostgreSQL
  const legacyUser = await findUserByEmailVerificationToken(hashedToken);
  if (legacyUser) {
    await verifyUserEmail(legacyUser.id);
    const token = generateToken({
      id: legacyUser.id,
      email: legacyUser.email,
      role: legacyUser.role,
    });
    return {
      message: "Email verified successfully.",
      user: {
        id: legacyUser.id,
        fullName: legacyUser.fullName,
        email: legacyUser.email,
        phone: legacyUser.phone,
        role: legacyUser.role,
      },
      token,
    };
  }

  throw new BadRequestError("Invalid or expired verification token.");
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
};
