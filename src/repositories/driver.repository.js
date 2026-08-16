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
};
