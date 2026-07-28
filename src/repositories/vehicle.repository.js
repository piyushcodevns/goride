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


module.exports = {
  createVehicle,
  getVehicleByDriverId,
  getVehicleByNumber,
  updateVehicle,
  deleteVehicle,
};