const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
  findAdminByEmail,
  findExistingAdminAccount,
  createAdminAccount,
  findAdminByIdWithPassword,
  createAdminSession,
  findActiveAdminSessionById,
  revokeSession,
  revokeSessionSafely,
  updateSessionLastActive,
  revokeAllAdminSessions,
  updateLastLogin,
  resetFailedLoginAttempts,
  incrementFailedLogin,
  lockAccount,
  createLoginHistory,
  createAuditLog,
  updateAdminPassword,
  saveAdminPasswordResetToken,
  findAdminByPasswordResetToken,
  resetAdminPassword,
} = require("../../repositories/admin/adminAuth.repository");

const {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  NotFoundError,
} = require("../../utils/AppError");

const { generateToken } = require("../../utils/jwt");
const hashToken = require("../../utils/hashToken");

const { sendEmail } = require("../email.service");

const {
  passwordResetTemplate,
} = require("../../templates/email/password-reset.template");

const logger = require("../../utils/logger");
const ADMIN_ROLES = require("../../constants/adminRoles");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;
const ADMIN_SESSION_DAYS = 7;
const PASSWORD_RESET_MINUTES = 15;

// =========================
// GENERATE REFRESH SECRET
// =========================

const generateRefreshSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

// =========================
// CREATE ADMIN
// =========================

const createAdmin = async ({
  fullName,
  email,
  phone,
  password,
  role,
  createdByAdminId,
  createdByRole,
}) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const normalizedPhone = String(phone || "").trim();

  // =========================
  // VALIDATE ADMIN ROLE
  // =========================

  if (!Object.values(ADMIN_ROLES).includes(role)) {
    throw new BadRequestError("Invalid admin role.");
  }

  // =========================
  // SUPER ADMIN PROTECTION
  // =========================

  if (
    role === ADMIN_ROLES.SUPER_ADMIN &&
    createdByRole !== ADMIN_ROLES.SUPER_ADMIN
  ) {
    throw new ForbiddenError(
      "Only a Super Admin can create another Super Admin.",
    );
  }

  // =========================
  // CHECK EXISTING ACCOUNT
  // =========================

  const existingUser = await findExistingAdminAccount(
    normalizedEmail,
    normalizedPhone,
  );

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new ConflictError(
        "An account with this email already exists.",
      );
    }

    throw new ConflictError(
      "An account with this phone number already exists.",
    );
  }

  // =========================
  // HASH PASSWORD
  // =========================

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // =========================
  // CREATE ADMIN
  // =========================

  const admin = await createAdminAccount({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    password: hashedPassword,
    role,
    isActive: true,
    isVerified: true,
    emailVerified: true,
  });

  // =========================
  // AUDIT LOG
  // =========================

  await createAuditLog({
    adminId: createdByAdminId,
    action: "CREATE",
    entity: "ADMIN",
    entityId: admin.id,
    metadata: {
      role: admin.role,
      createdByRole,
      createdByAdminId,
    },
  });

  logger.info("Admin created successfully.", {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    createdByRole,
  });

  return {
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
  };
};


// =========================
// LOGIN ADMIN
// =========================

const loginAdmin = async ({ email, password, ipAddress, userAgent }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const admin = await findAdminByEmail(normalizedEmail);

  // =========================
  // ADMIN NOT FOUND
  // =========================

  if (!admin) {
    await createLoginHistory({
      email: normalizedEmail,
      ipAddress,
      userAgent,
      status: "FAILED",
      failureReason: "EMAIL_NOT_FOUND",
    });

    logger.warn("Admin login failed. Email not found.", {
      email: normalizedEmail,
      ipAddress,
    });

    throw new UnauthorizedError("Invalid email or password.");
  }

  // =========================
  // ACCOUNT DISABLED
  // =========================

  if (!admin.isActive) {
    await createLoginHistory({
      userId: admin.id,
      email: admin.email,
      ipAddress,
      userAgent,
      status: "FAILED",
      failureReason: "ACCOUNT_DISABLED",
    });

    throw new ForbiddenError("Admin account is disabled.");
  }

  // =========================
  // ACCOUNT LOCKED
  // =========================

  if (
    admin.accountLockedUntil &&
    new Date(admin.accountLockedUntil) > new Date()
  ) {
    await createLoginHistory({
      userId: admin.id,
      email: admin.email,
      ipAddress,
      userAgent,
      status: "LOCKED",
      failureReason: "ACCOUNT_LOCKED",
    });

    throw new ForbiddenError(
      "Account is temporarily locked. Please try again later.",
    );
  }

  // =========================
  // VERIFY PASSWORD
  // =========================

  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    const updatedAdmin = await incrementFailedLogin(admin.id);

    const failedAttempts = updatedAdmin.failedLoginAttempts;

    // =========================
    // LOCK ACCOUNT
    // =========================

    if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000);

      await lockAccount(admin.id, lockUntil);

      await createLoginHistory({
        userId: admin.id,
        email: admin.email,
        ipAddress,
        userAgent,
        status: "LOCKED",
        failureReason: "MAX_ATTEMPTS_EXCEEDED",
      });

      logger.warn("Admin account locked.", {
        adminId: admin.id,
        email: admin.email,
        ipAddress,
      });

      throw new ForbiddenError(
        "Account locked due to multiple failed login attempts.",
      );
    }

    // =========================
    // INVALID PASSWORD
    // =========================

    await createLoginHistory({
      userId: admin.id,
      email: admin.email,
      ipAddress,
      userAgent,
      status: "FAILED",
      failureReason: "INVALID_PASSWORD",
    });

    logger.warn("Invalid admin password.", {
      adminId: admin.id,
      email: admin.email,
      failedAttempts,
      ipAddress,
    });

    throw new UnauthorizedError("Invalid email or password.");
  }

  // =========================
  // SUCCESSFUL LOGIN
  // =========================

  const refreshSecret = generateRefreshSecret();

  const refreshTokenHash = await bcrypt.hash(refreshSecret, SALT_ROUNDS);

  await resetFailedLoginAttempts(admin.id);
  await updateLastLogin(admin.id);

  const session = await createAdminSession({
    userId: admin.id,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000),
  });

  // Refresh token contains session ID.
  //
  // Format:
  // sessionId.refreshSecret
  //
  // This allows O(1) session lookup.
  const refreshToken = `${session.id}.${refreshSecret}`;

  // =========================
  // ACCESS TOKEN
  // =========================

  const accessToken = generateToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    sessionId: session.id,
  });

  // =========================
  // LOGIN HISTORY
  // =========================

  await createLoginHistory({
    userId: admin.id,
    email: admin.email,
    ipAddress,
    userAgent,
    status: "SUCCESS",
  });

  // =========================
  // AUDIT LOG
  // =========================

  await createAuditLog({
    adminId: admin.id,
    action: "LOGIN",
    entity: "ADMIN",
    entityId: admin.id,
    metadata: {
      role: admin.role,
      sessionId: session.id,
    },
    ipAddress,
    userAgent,
  });

  logger.info("Admin login successful.", {
    adminId: admin.id,
    email: admin.email,
    ipAddress,
  });

  return {
    user: {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
    },
    token: accessToken,
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
};

// =========================
// REFRESH ADMIN TOKEN
// =========================

const refreshAdminToken = async ({ refreshToken, ipAddress, userAgent }) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is required.");
  }

  // Expected format:
  //
  // sessionId.refreshSecret
  //

  const separatorIndex = refreshToken.indexOf(".");

  if (separatorIndex <= 0) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  const sessionId = refreshToken.slice(0, separatorIndex);

  const refreshSecret = refreshToken.slice(separatorIndex + 1);

  if (!sessionId || !refreshSecret) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  logger.info("Refresh token request received.", {
    sessionId,
  });

  // =========================
  // FIND SESSION
  // =========================
  //
  // O(1) lookup.
  // We no longer load every active session.
  //

  const matchedSession = await findActiveAdminSessionById(sessionId);

  if (!matchedSession) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  // =========================
  // VERIFY REFRESH SECRET
  // =========================

  const isMatch = await bcrypt.compare(
    refreshSecret,
    matchedSession.refreshTokenHash,
  );

  if (!isMatch) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  const admin = matchedSession.user;

  if (!admin) {
    throw new UnauthorizedError("Admin account not found.");
  }

  // =========================
  // VERIFY ADMIN ROLE
  // =========================

  if (!Object.values(ADMIN_ROLES).includes(admin.role)) {
    throw new ForbiddenError("Unauthorized admin role.");
  }

  // =========================
  // VERIFY ACCOUNT STATUS
  // =========================

  if (!admin.isActive) {
    throw new ForbiddenError("Admin account is disabled.");
  }

  // =========================
  // VERIFY ACCOUNT LOCK
  // =========================

  if (
    admin.accountLockedUntil &&
    new Date(admin.accountLockedUntil) > new Date()
  ) {
    throw new ForbiddenError(
      "Account is temporarily locked. Please try again later.",
    );
  }

  // =========================
  // GENERATE NEW REFRESH SECRET
  // =========================

  const newRefreshSecret = generateRefreshSecret();

  const newRefreshTokenHash = await bcrypt.hash(newRefreshSecret, SALT_ROUNDS);

  // =========================
  // REVOKE OLD SESSION
  // =========================
  //
  // updateMany + count check prevents
  // concurrent refresh-token replay.
  //
  // Only one request can successfully
  // rotate the current session.
  //

  const revokedSession = await revokeSessionSafely(matchedSession.id);

  if (revokedSession.count !== 1) {
    throw new UnauthorizedError("Admin session is no longer active.");
  }

  // =========================
  // CREATE NEW SESSION
  // =========================

  const newSession = await createAdminSession({
    userId: admin.id,
    refreshTokenHash: newRefreshTokenHash,
    ipAddress,
    userAgent,
    deviceName: matchedSession.deviceName,
    expiresAt: new Date(Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000),
  });

  await updateSessionLastActive(newSession.id);

  // =========================
  // GENERATE NEW ACCESS TOKEN
  // =========================

  const newAccessToken = generateToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    sessionId: newSession.id,
  });

  // =========================
  // CREATE NEW REFRESH TOKEN
  // =========================

  const newRefreshToken = `${newSession.id}.${newRefreshSecret}`;

  // =========================
  // AUDIT LOG
  // =========================

  await createAuditLog({
    adminId: admin.id,
    action: "LOGIN",
    entity: "ADMIN",
    entityId: admin.id,
    metadata: {
      action: "REFRESH_TOKEN_ROTATED",
      oldSessionId: matchedSession.id,
      newSessionId: newSession.id,
    },
    ipAddress,
    userAgent,
  });

  logger.info("Admin refresh token rotated successfully.", {
    adminId: admin.id,
    oldSessionId: matchedSession.id,
    newSessionId: newSession.id,
    ipAddress,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionId: newSession.id,
  };
};

// =========================
// ADMIN LOGOUT
// =========================

const logoutAdmin = async ({ sessionId, adminId, ipAddress, userAgent }) => {
  if (!sessionId) {
    throw new UnauthorizedError("Session ID is required.");
  }

  if (!adminId) {
    throw new UnauthorizedError("Admin authentication required.");
  }

  // Find only the active, non-expired session.
  const session = await findActiveAdminSessionById(sessionId);

  if (!session) {
    throw new UnauthorizedError("Invalid or inactive admin session.");
  }

  // Prevent an admin from revoking another admin's session.
  if (session.userId !== adminId) {
    throw new UnauthorizedError("Invalid or inactive admin session.");
  }

  // Revoke the session safely.
  const revokedSession = await revokeSessionSafely(session.id);

  // Protect against race conditions / double logout.
  if (revokedSession.count !== 1) {
    throw new UnauthorizedError("Admin session is no longer active.");
  }

  await createLoginHistory({
    userId: adminId,
    email: session.user.email,
    ipAddress,
    userAgent,
    status: "LOGOUT",
  });

  await createAuditLog({
    adminId,
    action: "LOGOUT",
    entity: "ADMIN",
    entityId: adminId,
    metadata: {
      sessionId: session.id,
    },
    ipAddress,
    userAgent,
  });

  logger.info("Admin logout successful.", {
    adminId,
    sessionId: session.id,
    ipAddress,
  });

  return {
    sessionId: session.id,
  };
};

// =========================
// CHANGE ADMIN PASSWORD
// =========================

const changeAdminPassword = async (
  adminId,
  currentPassword,
  newPassword,
  confirmPassword,
) => {
  if (newPassword !== confirmPassword) {
    throw new BadRequestError(
      "New password and confirm password do not match.",
    );
  }

  const admin = await findAdminByIdWithPassword(adminId);

  if (!admin) {
    throw new NotFoundError("Admin account not found.");
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.password);

  if (!isMatch) {
    throw new UnauthorizedError("Current password is incorrect.");
  }

  const isSamePassword = await bcrypt.compare(newPassword, admin.password);

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password.",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await updateAdminPassword(adminId, hashedPassword);

  // Password change invalidates
  // all existing admin sessions.
  await revokeAllAdminSessions(adminId);

  await createAuditLog({
    adminId,
    action: "UPDATE",
    entity: "ADMIN",
    entityId: adminId,
    metadata: {
      action: "PASSWORD_CHANGED",
    },
  });

  return {
    message: "Admin password changed successfully.",
  };
};

// =========================
// FORGOT ADMIN PASSWORD
// =========================

const forgotAdminPassword = async (email) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const admin = await findAdminByEmail(normalizedEmail);

  // Do not reveal whether an admin account exists.
  if (admin) {
    try {
      const resetOtp = crypto.randomInt(100000, 1000000).toString();

      const hashedOtp = hashToken(resetOtp);

      const passwordResetExpires = new Date(
        Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000,
      );

      await saveAdminPasswordResetToken(
        admin.id,
        hashedOtp,
        passwordResetExpires,
      );

      await sendEmail({
        to: admin.email,
        subject: "GoRide Admin Password Reset",
        html: passwordResetTemplate({
          token: resetOtp,
        }),
      });

      logger.info("Admin password reset email sent.", {
        adminId: admin.id,
        email: admin.email,
      });
    } catch (error) {
      logger.error("Failed to send admin password reset email.", {
        error,
        adminId: admin.id,
      });

      // Keep generic response.
    }
  }

  // Same response whether account exists or not.
  return {
    message:
      "If an admin account exists with this email, a password reset link has been sent.",
  };
};

// =========================
// RESET ADMIN PASSWORD
// =========================

const resetAdminPasswordService = async (
  resetToken,
  newPassword,
  confirmPassword,
) => {
  if (newPassword !== confirmPassword) {
    throw new BadRequestError(
      "New password and confirm password do not match.",
    );
  }

  const hashedToken = hashToken(resetToken);

  const admin = await findAdminByPasswordResetToken(hashedToken);

  if (!admin) {
    throw new BadRequestError("Invalid or expired password reset token.");
  }

  const isSamePassword = await bcrypt.compare(newPassword, admin.password);

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password.",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await resetAdminPassword(admin.id, hashedPassword);

  // Password reset invalidates
  // all existing admin sessions.
  await revokeAllAdminSessions(admin.id);

  await createAuditLog({
    adminId: admin.id,
    action: "UPDATE",
    entity: "ADMIN",
    entityId: admin.id,
    metadata: {
      action: "PASSWORD_RESET",
    },
  });

  return {
    message: "Admin password reset successfully.",
  };
};

// =========================
// EXPORTS
// =========================

module.exports = {
  loginAdmin,
  createAdmin,
  refreshAdminToken,
  logoutAdmin,
  changeAdminPassword,
  forgotAdminPassword,
  resetAdminPasswordService,
};
