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
const updateDriverAvailability = async (userId, availability) => {
  return prisma.driver.update({
    where: {
      userId,
    },
    data: {
      availability,
    },
  });
};

module.exports = {
  createDriver,
  getDriverByUserId,
  getDriverByLicenseNumber,
  getDriverByAadharNumber,
  updateDriver,
  updateDriverAvailability,
};