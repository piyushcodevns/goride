const {
  findUsers,
  exportUsers,
  findUserById,
  findUserRideHistory,
  findUserPaymentHistory,
  findUserCouponHistory,
  findUserNotifications,
  updateUserStatus,
  blockUser,
  softDeleteUser,
} = require("../../repositories/admin/adminUser.repository");

const {
  createAuditLog,
} = require("../../repositories/admin/adminAuth.repository");

const { NotFoundError, ConflictError } = require("../../utils/AppError");

/**
 * Get paginated users.
 */
const getUsers = async (filters) => {
  return findUsers(filters);
};

/**
 * Export users as CSV.
 */
const exportUsersCsv = async (filters) => {
  const users = await exportUsers(filters);

  const escapeCsv = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const headers = [
    "id",
    "fullName",
    "email",
    "phone",
    "role",
    "gender",
    "emailVerified",
    "isVerified",
    "isActive",
    "isBlocked",
    "deletedAt",
    "lastLoginAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = users.map((user) =>
    headers.map((header) => escapeCsv(user[header])).join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};

/**
 * Get user details.
 */
const getUserDetails = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return user;
};

/**
 * Get user's ride history.
 */
const getUserRideHistory = async (userId, pagination) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return findUserRideHistory({
    userId,
    ...pagination,
  });
};

/**
 * Get user's payment history.
 */
const getUserPaymentHistory = async (userId, pagination) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return findUserPaymentHistory({
    userId,
    ...pagination,
  });
};

/**
 * Get user's coupon usage history.
 */
const getUserCouponHistory = async (userId, pagination) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return findUserCouponHistory({
    userId,
    ...pagination,
  });
};

/**
 * Get user's notification history.
 */
const getUserNotifications = async (userId, pagination) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return findUserNotifications({
    userId,
    ...pagination,
  });
};

/**
 * Activate user.
 */
const activateUser = async ({ userId, adminId, ipAddress, userAgent }) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (user.deletedAt) {
    throw new ConflictError("Deleted user cannot be activated.");
  }

  if (user.isActive) {
    throw new ConflictError("User is already active.");
  }

  const updatedUser = await updateUserStatus(userId, true);

  await createAuditLog({
    adminId,
    action: "ACTIVATE",
    entity: "USER",
    entityId: userId,
    metadata: {
      previousStatus: false,
      newStatus: true,
    },
    ipAddress,
    userAgent,
  });

  return updatedUser;
};

/**
 * Suspend user.
 */
const suspendUser = async ({ userId, adminId, ipAddress, userAgent }) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (user.deletedAt) {
    throw new ConflictError("Deleted user cannot be suspended.");
  }

  if (!user.isActive) {
    throw new ConflictError("User is already inactive.");
  }

  const updatedUser = await updateUserStatus(userId, false);

  await createAuditLog({
    adminId,
    action: "SUSPEND",
    entity: "USER",
    entityId: userId,
    metadata: {
      previousStatus: true,
      newStatus: false,
    },
    ipAddress,
    userAgent,
  });

  return updatedUser;
};

/**
 * Block user.
 */
const blockUserAccount = async ({ userId, adminId, ipAddress, userAgent }) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (user.deletedAt) {
    throw new ConflictError("Deleted user cannot be blocked.");
  }

  if (user.isBlocked) {
    throw new ConflictError("User is already blocked.");
  }

  const updatedUser = await blockUser(userId);

  await createAuditLog({
    adminId,
    action: "BLOCK",
    entity: "USER",
    entityId: userId,
    metadata: {
      operation: "BLOCK",
      previousIsBlocked: false,
      newIsBlocked: true,
    },
    ipAddress,
    userAgent,
  });

  return updatedUser;
};

/**
 * Soft delete user.
 */
const deleteUser = async ({ userId, adminId, ipAddress, userAgent }) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (user.deletedAt) {
    throw new ConflictError("User is already deleted.");
  }

  const deletedUser = await softDeleteUser(userId);

  await createAuditLog({
    adminId,
    action: "DELETE",
    entity: "USER",
    entityId: userId,
    metadata: {
      operation: "SOFT_DELETE",
      previousStatus: user.isActive,
      newStatus: false,
      deletedAt: deletedUser.deletedAt,
    },
    ipAddress,
    userAgent,
  });

  return deletedUser;
};

module.exports = {
  getUsers,
  exportUsersCsv,
  getUserDetails,
  getUserRideHistory,
  getUserPaymentHistory,
  getUserCouponHistory,
  getUserNotifications,
  activateUser,
  suspendUser,
  blockUserAccount,
  deleteUser,
};


