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

// Update Vehicle
const updateVehicle = async (driverId, data) => {
  return prisma.vehicle.update({
    where: {
      driverId,
    },
    data,
  });
};

// Delete Vehicle
const deleteVehicle = async (driverId) => {
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