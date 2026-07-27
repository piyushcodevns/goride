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

const addVehicle = async (userId, data) => {
  // Validate request
  const validatedData = createVehicleSchema.parse(data);

  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Check driver already has a vehicle
  const existingVehicle = await getVehicleByDriverId(driver.id);

  if (existingVehicle) {
    throw new Error("Driver already has a registered vehicle.");
  }

  // Check duplicate vehicle number
  const vehicleNumberExists = await getVehicleByNumber(
    validatedData.vehicleNumber
  );

  if (vehicleNumberExists) {
    throw new Error("Vehicle number already exists.");
  }

  // Create vehicle
  return await createVehicle({
    driverId: driver.id,
    vehicleNumber: validatedData.vehicleNumber,
    vehicleType: validatedData.vehicleType,
    brand: validatedData.brand,
    model: validatedData.model,
    color: validatedData.color,
    seats: validatedData.seats,
  });
};

const getVehicle = async (userId) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Get vehicle
  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  return vehicle;
};

const updateMyVehicle = async (userId, data) => {
  // Validate request
  const validatedData = updateVehicleSchema.parse(data);

  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Check vehicle exists
  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  // Update vehicle
  return await updateVehicle(driver.id, validatedData);
};

const deleteMyVehicle = async (userId) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Check vehicle exists
  const vehicle = await getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  // Delete vehicle
  return await deleteVehicle(driver.id);
};

module.exports = {
  addVehicle,
  getVehicle,
  updateMyVehicle,
  deleteMyVehicle,
};