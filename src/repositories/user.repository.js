const prisma = require("../config/prisma");

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      gender: true,
      profileImage: true,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Update user profile
 */
const updateUserProfile = async (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      gender: true,
      profileImage: true,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

module.exports = {
  getUserById,
  updateUserProfile,
};