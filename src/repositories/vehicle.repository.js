const prisma = require("../config/prisma");

// Create Vehicle
const createVehicle = async (data) => {
  return prisma.vehicle.create({
    data,
  });
};

// Get Vehicle by Driver ID
const getVehicleByDriverId = async (driverId) => {
  return prisma.vehicle.findUnique({
    where: {
      driverId,
    },
    include: {
      driver: true,
    },
  });
};

// Get Vehicle by Vehicle Number
const getVehicleByNumber = async (vehicleNumber) => {
  return prisma.vehicle.findUnique({
    where: {
      vehicleNumber,
    },
  });
};

// Update Vehicle by Driver ID
const updateVehicle = async (driverId, data) => {
  return prisma.vehicle.update({
    where: {
      driverId,
    },
    data,
  });
};

// Delete Vehicle with ownership validation support
const deleteVehicle = async (driverId) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: {
      driverId,
    },
  });

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  return prisma.vehicle.delete({
    where: {
      driverId,
    },
  });
};

// ==========================================
// Vehicle Document Repository Methods
// ==========================================

const createVehicleDocument = async (data) => {
  return prisma.vehicleDocument.create({
    data,
  });
};

const getVehicleDocuments = async (vehicleId) => {
  return prisma.vehicleDocument.findMany({
    where: {
      vehicleId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getVehicleDocumentByType = async (vehicleId, documentType) => {
  return prisma.vehicleDocument.findUnique({
    where: {
      vehicleId_documentType: {
        vehicleId,
        documentType,
      },
    },
  });
};

const getVehicleDocumentById = async (id) => {
  return prisma.vehicleDocument.findUnique({
    where: {
      id,
    },
    include: {
      vehicle: {
        include: {
          driver: true,
        },
      },
    },
  });
};

const updateVehicleDocument = async (id, data) => {
  return prisma.vehicleDocument.update({
    where: {
      id,
    },
    data,
  });
};

const deleteVehicleDocument = async (id) => {
  return prisma.vehicleDocument.delete({
    where: {
      id,
    },
  });
};

module.exports = {
  createVehicle,
  getVehicleByDriverId,
  getVehicleByNumber,
  updateVehicle,
  deleteVehicle,

  createVehicleDocument,
  getVehicleDocuments,
  getVehicleDocumentByType,
  getVehicleDocumentById,
  updateVehicleDocument,
  deleteVehicleDocument,
};