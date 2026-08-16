const prisma = require("../../config/prisma");
const ADMIN_ROLES = require("../../constants/adminRoles");

// =========================
// Find Admin By Email
// =========================
const findAdminByEmail = async (email) => {
  return prisma.user.findFirst({
    where: {
      email,
      role: {
        in: Object.values(ADMIN_ROLES),
      },
    },
  });
};

// =========================
// Find Admin By ID
// =========================
const findAdminById = async (id) => {
  return prisma.user.findFirst({
    where: {
      id,
      role: {
        in: Object.values(ADMIN_ROLES),
      },
    },
  });
};

// =========================
// Create Admin Session
// =========================
const createAdminSession = async (data) => {
  return prisma.adminSession.create({
    data,
  });
};

// =========================
// Find Active Admin Session By ID
// =========================
const findActiveAdminSessionById = async (sessionId) => {
  return prisma.adminSession.findFirst({
    where: {
      id: sessionId,
      isRevoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
};

// =========================
// Find Active Admin Sessions
// =========================
const findActiveAdminSessions = async () => {
  return prisma.adminSession.findMany({
    where: {
      isRevoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// =========================
// Revoke Session
// =========================
const revokeSession = async (sessionId) => {
  return prisma.adminSession.update({
    where: {
      id: sessionId,
    },
    data: {
      isRevoked: true,
    },
  });
};

// =========================
// Revoke Session Safely
// =========================
const revokeSessionSafely = async (sessionId) => {
  return prisma.adminSession.updateMany({
    where: {
      id: sessionId,
      isRevoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      isRevoked: true,
    },
  });
};

// =========================
// Update Session Last Active
// =========================
const updateSessionLastActive = async (sessionId) => {
  return prisma.adminSession.update({
    where: {
      id: sessionId,
    },
    data: {
      lastActiveAt: new Date(),
    },
  });
};

// =========================
// Revoke All Admin Sessions
// =========================
const revokeAllAdminSessions = async (userId) => {
  return prisma.adminSession.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
    },
  });
};

// =========================
// Update Last Login
// =========================
const updateLastLogin = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
};

// =========================
// Reset Failed Login Attempts
// =========================
const resetFailedLoginAttempts = async (adminId) => {
  return prisma.user.update({
    where: {
      id: adminId,
    },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
    },
  });
};

// =========================
// Increment Failed Login
// =========================
const incrementFailedLogin = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      failedLoginAttempts: {
        increment: 1,
      },
    },
  });
};

// =========================
// Lock Account
// =========================
const lockAccount = async (userId, accountLockedUntil) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      accountLockedUntil,
    },
  });
};

// =========================
// Create Login History
// =========================
const createLoginHistory = async (data) => {
  return prisma.adminLoginHistory.create({
    data,
  });
};

// =========================
// Create Audit Log
// =========================
const createAuditLog = async (data) => {
  return prisma.auditLog.create({
    data,
  });
};

const updateAdminPassword = async (adminId, hashedPassword) => {
  return prisma.user.update({
    where: {
      id: adminId,
    },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
  });
};

const saveAdminPasswordResetToken = async (
  adminId,
  passwordResetToken,
  passwordResetExpires,
) => {
  return prisma.user.update({
    where: { id: adminId },
    data: {
      passwordResetToken,
      passwordResetExpires,
    },
  });
};

const findAdminByPasswordResetToken = async (passwordResetToken) => {
  return prisma.user.findFirst({
    where: {
      passwordResetToken,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });
};

const resetAdminPassword = async (adminId, hashedPassword) => {
  return prisma.user.update({
    where: { id: adminId },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      lastPasswordResetAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
};

module.exports = {
  findAdminByEmail,
  findAdminById,

  createAdminSession,
  findActiveAdminSessionById,
  findActiveAdminSessions,
  revokeSession,
  revokeSessionSafely,
  revokeAllAdminSessions,
  revokeAllSessions: revokeAllAdminSessions,
  updateSessionLastActive,

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
};
