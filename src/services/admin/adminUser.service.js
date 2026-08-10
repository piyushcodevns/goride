const {
  findUsers,
  findUserById,
  findUserRideHistory,
  findUserPaymentHistory,
  findUserCouponHistory,
  findUserNotifications,
  updateUserStatus,
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
const activateUser = async ({
  userId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
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
const suspendUser = async ({
  userId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
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

module.exports = {
  getUsers,
  getUserDetails,
  getUserRideHistory,
  getUserPaymentHistory,
  getUserCouponHistory,
  getUserNotifications,
  activateUser,
  suspendUser,
};
