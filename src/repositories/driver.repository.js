const prisma = require("../config/prisma");

// Common User Selection
const userSelect = {
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
};

// Common Vehicle Selection
const vehicleSelect = {
  id: true,
  vehicleNumber: true,
  vehicleType: true,
  brand: true,
  model: true,
  color: true,
  seats: true,
  createdAt: true,
  updatedAt: true,
};

// Create Driver
const createDriver = async (data) => {
  return prisma.driver.create({
    data,
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

// Get Driver by User ID
const getDriverByUserId = async (userId) => {
  return prisma.driver.findUnique({
    where: {
      userId,
    },
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

// Get Driver by Driver ID
const getDriverById = async (driverId, db = prisma) => {
  return db.driver.findUnique({
    where: {
      id: driverId,
    },
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

// Get Driver by License Number
const getDriverByLicenseNumber = async (licenseNumber) => {
  return prisma.driver.findUnique({
    where: {
      licenseNumber,
    },
  });
};

// Get Driver by Aadhar Number
const getDriverByAadharNumber = async (aadharNumber) => {
  return prisma.driver.findUnique({
    where: {
      aadharNumber,
    },
  });
};

// Update Driver
const updateDriver = async (userId, data) => {
  return prisma.driver.update({
    where: {
      userId,
    },
    data,
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

// Update Driver Availability
const updateDriverAvailability = async (
  driverId,
  availability,
  db = prisma,
) => {
  return db.driver.update({
    where: {
      id: driverId,
    },
    data: {
      availability,
    },
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

// Approve / Reject Driver
const updateDriverStatus = async (driverId, status) => {
  return prisma.driver.update({
    where: {
      id: driverId,
    },
    data: {
      status,
    },
    include: {
      user: {
        select: userSelect,
      },
      vehicle: {
        select: vehicleSelect,
      },
    },
  });
};

const createDriverDocument = async (data) => {
  return prisma.driverDocument.create({
    data,
  });
};

const getDriverDocuments = async (driverId) => {
  return prisma.driverDocument.findMany({
    where: {
      driverId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getDriverDocumentByType = async (driverId, documentType) => {
  return prisma.driverDocument.findUnique({
    where: {
      driverId_documentType: {
        driverId,
        documentType,
      },
    },
  });
};

const getDriverDocumentById = async (id) => {
  return prisma.driverDocument.findUnique({
    where: { id },
  });
};

const deleteDriverDocument = async (id) => {
  return prisma.driverDocument.delete({
    where: { id },
  });
};

/**
 * Replace a rejected document and return it to the review queue.
 */
const replaceRejectedDriverDocument = async ({
  documentId,
  documentNumber,
  fileUrl,
  filePublicId,
}) => {
  return prisma.driverDocument.update({
    where: {
      id: documentId,
    },
    data: {
      documentNumber,
      fileUrl,
      filePublicId,
      status: "PENDING",
      rejectionReason: null,
    },
  });
};

const getEligibleDriversForRecommendation = async (
  vehicleType,
  db = prisma,
) => {
  return db.driver.findMany({
    where: {
      status: "APPROVED",
      availability: "AVAILABLE",

      vehicle: {
        is: {
          status: "APPROVED",
          vehicleType,
        },
      },

      rides: {
        none: {
          status: {
            in: ["ACCEPTED", "ARRIVED", "STARTED"],
          },
        },
      },
    },

    select: {
      id: true,
      status: true,
      availability: true,
      experience: true,
      averageRating: true,
      totalRatings: true,
      createdAt: true,

      vehicle: {
        select: {
          id: true,
          vehicleType: true,
          status: true,
        },
      },
    },

    orderBy: [
      {
        averageRating: "desc",
      },
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });
};

module.exports = {
  createDriver,
  getDriverByUserId,
  getDriverById,
  getDriverByLicenseNumber,
  getDriverByAadharNumber,
  updateDriver,
  updateDriverAvailability,
  updateDriverStatus,

  createDriverDocument,
  getDriverDocuments,
  getDriverDocumentByType,
  getDriverDocumentById,
  deleteDriverDocument,
  replaceRejectedDriverDocument,

  getEligibleDriversForRecommendation,
};
