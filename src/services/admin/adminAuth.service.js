const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
  findAdminByEmail,
  createAdminSession,
  findActiveAdminSessions,
  revokeSession,
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
const prisma = require("../../config/prisma");
const ADMIN_ROLES = require("../../constants/adminRoles");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const createAdmin = async ({ fullName, email, phone, password }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: normalizedEmail,
        },
        {
          phone: phone.trim(),
        },
      ],
    },
  });

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

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      isVerified: true,
      emailVerified: true,
    },
  });

  logger.info("Admin created successfully.", {
    adminId: admin.id,
    email: admin.email,
  });

  return {
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
  };
};

const loginAdmin = async ({ email, password, ipAddress, userAgent }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const admin = await findAdminByEmail(normalizedEmail);

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

  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    const updatedAdmin = await incrementFailedLogin(admin.id);
    const failedAttempts = updatedAdmin.failedLoginAttempts;

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

  const accessToken = generateToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

  await resetFailedLoginAttempts(admin.id);
  await updateLastLogin(admin.id);

  const session = await createAdminSession({
    userId: admin.id,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await createLoginHistory({
    userId: admin.id,
    email: admin.email,
    ipAddress,
    userAgent,
    status: "SUCCESS",
  });

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

const refreshAdminToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is required.");
  }

  const sessions = await findActiveAdminSessions();
  logger.info("Refresh token request received.", {
    activeSessions: sessions.length,
  });

  let matchedSession = null;

  for (const session of sessions) {
    const isMatch = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (isMatch) {
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  const admin = matchedSession.user;

  if (!admin) {
    throw new UnauthorizedError("Admin account not found.");
  }

  if (!Object.values(ADMIN_ROLES).includes(admin.role)) {
    throw new ForbiddenError("Unauthorized admin role.");
  }

  if (!admin.isActive) {
    throw new ForbiddenError("Admin account is disabled.");
  }

  if (
    admin.accountLockedUntil &&
    new Date(admin.accountLockedUntil) > new Date()
  ) {
    throw new ForbiddenError(
      "Account is temporarily locked. Please try again later.",
    );
  }

  const accessToken = generateToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  return {
    accessToken,
    sessionId: matchedSession.id,
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

  const sessions = await findActiveAdminSessions();

  const session = sessions.find(
    (item) => item.id === sessionId && item.userId === adminId,
  );

  if (!session) {
    throw new UnauthorizedError("Invalid or inactive admin session.");
  }

  await revokeSession(session.id);

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

  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });

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
  
  await revokeAllAdminSessions(adminId);

  return {
    message: "Admin password changed successfully.",
  };
};

const forgotAdminPassword = async (email) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
 
  const admin = await findAdminByEmail(normalizedEmail);
 
  // Do not reveal whether an admin account exists.
  if (admin) {
    try {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = hashToken(resetToken);
      const passwordResetExpires = new Date(
        Date.now() + 15 * 60 * 1000, // 15 minutes
      );

      await saveAdminPasswordResetToken(
        admin.id,
        hashedToken,
        passwordResetExpires,
      );

      await sendEmail({
        to: admin.email,
        subject: "GoRide Admin Password Reset",
        html: passwordResetTemplate({
          token: resetToken,
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
      // Do not re-throw; we still want to return the generic message.
    }
  }
 
  // Always return the same generic message to prevent email enumeration.
  return {
    message:
      "If an admin account exists with this email, a password reset link has been sent.",
  };
};

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
    throw new BadRequestError(
      "Invalid or expired password reset token.",
    );
  }

  const isSamePassword = await bcrypt.compare(
    newPassword,
    admin.password,
  );

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password.",
    );
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    SALT_ROUNDS,
  );

  await resetAdminPassword(admin.id, hashedPassword);
  
  await revokeAllAdminSessions(admin.id);

  return {
    message: "Admin password reset successfully.",
  };
};

module.exports = {
  loginAdmin,
  createAdmin,
  refreshAdminToken,
  logoutAdmin,
  changeAdminPassword,
  forgotAdminPassword,
  resetAdminPasswordService,
};
