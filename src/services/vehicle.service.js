const {
  createVehicle,
  getVehicleByDriverId,
  getVehicleByNumber,
  updateVehicle,
  deleteVehicle,
} = require("../repositories/vehicle.repository");

const { getDriverByUserId } = require("../repositories/driver.repository");

const {
  createVehicleSchema,
  updateVehicleSchema,
} = require("../validators/vehicle.validator");

// Add Vehicle
const addVehicle = async (userId, data) => {
  const validatedData = createVehicleSchema.parse(data);

  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  const existingVehicle = await getVehicleByDriverId(driver.id);

  if (existingVehicle) {
    throw new Error("Driver already has a registered vehicle.");
  }

  const vehicleNumberExists = await getVehicleByNumber(
    validatedData.vehicleNumber,
  );

  if (vehicleNumberExists) {
    throw new Error("Vehicle number already exists.");
  }

  return createVehicle({
    driverId: driver.id,
    vehicleNumber: validatedData.vehicleNumber,
    vehicleType: validatedData.vehicleType,
    category: validatedData.category,
    brand: validatedData.brand,
    model: validatedData.model,
    color: validatedData.color,
    seats: validatedData.seats,
  });
};

// Get My Vehicle
const getVehicle = async (userId) => {
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  return vehicle;
};

// Update My Vehicle
const updateMyVehicle = async (userId, data) => {
  const validatedData = updateVehicleSchema.parse(data);

  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  if (
    validatedData.vehicleNumber &&
    validatedData.vehicleNumber !== vehicle.vehicleNumber
  ) {
    const existingVehicle = await getVehicleByNumber(
      validatedData.vehicleNumber,
    );

    if (existingVehicle) {
      throw new Error("Vehicle number already exists.");
    }
  }

  return updateVehicle(driver.id, validatedData);
};

// Delete My Vehicle
const deleteMyVehicle = async (userId) => {
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  return deleteVehicle(driver.id);
};

module.exports = {
  addVehicle,
  getVehicle,
  updateMyVehicle,
  deleteMyVehicle,
};
