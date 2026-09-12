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
 * Save email verification token
 */
const saveEmailVerificationToken = async (
  userId,
  emailVerificationToken,
  emailVerificationExpires,
) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      emailVerificationToken,
      emailVerificationExpires,
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
 * Find user by email verification token
 */
const findUserByEmailVerificationToken = async (emailVerificationToken) => {
  return prisma.user.findFirst({
    where: {
      emailVerificationToken,
      emailVerificationExpires: {
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
 * Mark email as verified
 */
const verifyUserEmail = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      emailVerified: true,
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
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

/**
 * Find user with password by ID
 */
const findUserByIdWithPassword = async (id) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

/**
 * Update user password
 */
const changeUserPassword = async (userId, hashedPassword) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });
};

module.exports = {
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByPhone,
  findUserByResetToken,
  findUserByEmailVerificationToken,
  findUserById,
  createUser,
  savePasswordResetToken,
  saveEmailVerificationToken,
  updatePassword,
  verifyUserEmail,
  findUserByIdWithPassword,
  changeUserPassword,
};
