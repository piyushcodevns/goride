const prisma = require("../config/prisma");

/**
 * Find user by email
 */
const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

/**
 * Find user by ID
 */
const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

/**
 * Create user
 */
const createUser = async (data) => {
  return prisma.user.create({
    data,
  });
};

/**
 * Save password reset token
 */
const savePasswordResetToken = async (
  userId,
  passwordResetToken,
  passwordResetExpires,
) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordResetToken,
      passwordResetExpires,
    },
  });
};

/**
 * Find user by phone
 */
const findUserByPhone = async (phone) => {
  return prisma.user.findUnique({
    where: { phone },
  });
};

/**
 * Find user by password reset token
 */
const findUserByResetToken = async (passwordResetToken) => {
  return prisma.user.findFirst({
    where: {
      passwordResetToken,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });
};

/**
 * Update password and clear reset token
 */
const updatePassword = async (userId, hashedPassword) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
};

/**
 * Find user by email with password
 */
const findUserByEmailWithPassword = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

module.exports = {
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByPhone,
  findUserByResetToken,
  findUserById,
  createUser,
  savePasswordResetToken,
  updatePassword,
};
