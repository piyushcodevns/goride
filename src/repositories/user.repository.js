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

/**
 * Get all documents for a user
 */
const getUserDocuments = async (userId) => {
  return prisma.userDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * Get single user document by ID
 */
const getUserDocumentById = async (id) => {
  return prisma.userDocument.findUnique({
    where: { id },
  });
};

/**
 * Create user document
 */
const createUserDocument = async (data) => {
  return prisma.userDocument.create({
    data,
  });
};

/**
 * Delete user document by ID
 */
const deleteUserDocument = async (id) => {
  return prisma.userDocument.delete({
    where: { id },
  });
};

/**
 * Find user document by type
 */
const findUserDocumentByType = async (userId, documentType) => {
  return prisma.userDocument.findUnique({
    where: {
      userId_documentType: {
        userId,
        documentType,
      },
    },
  });
};

module.exports = {
  getUserById,
  updateUserProfile,
  getUserDocuments,
  getUserDocumentById,
  createUserDocument,
  deleteUserDocument,
  findUserDocumentByType,
};