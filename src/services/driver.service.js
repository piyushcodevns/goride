const {
  createDriver,
  getDriverByUserId,
  getDriverById,
  getDriverByLicenseNumber,
  getDriverByAadharNumber,
  updateDriver,
  updateDriverAvailability,
  updateDriverStatus,
} = require("../repositories/driver.repository");

const { NotFoundError, BadRequestError } = require("../utils/AppError");

const { registerDriverSchema } = require("../validators/driver.validator");

const registerDriver = async (userId, data) => {
  const validatedData = registerDriverSchema.parse(data);

  const existingDriver = await getDriverByUserId(userId);

  if (existingDriver) {
    throw new BadRequestError("Driver profile already exists.");
  }

  const licenseExists = await getDriverByLicenseNumber(
    validatedData.licenseNumber,
  );

  if (licenseExists) {
    throw new BadRequestError("License number already exists.");
  }

  const aadharExists = await getDriverByAadharNumber(
    validatedData.aadharNumber,
  );

  if (aadharExists) {
    throw new BadRequestError("Aadhar number already exists.");
  }

  return await createDriver({
    userId,
    licenseNumber: validatedData.licenseNumber,
    aadharNumber: validatedData.aadharNumber,
    experience: validatedData.experience,
  });
};

const getDriverProfile = async (userId) => {
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  return driver;
};

const updateDriverProfile = async (userId, data) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  // Update driver
  return await updateDriver(userId, data);
};

const updateAvailability = async (userId, availability) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  // Update availability using Driver ID
  return await updateDriverAvailability(driver.id, availability);
};
/**
 * Approve / Reject Driver
 */
const approveDriver = async (driverId, status) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  const allowedStatuses = ["APPROVED", "REJECTED"];

  if (!allowedStatuses.includes(status)) {
    throw new BadRequestError("Status must be either APPROVED or REJECTED.");
  }

  if (driver.status !== "PENDING") {
    throw new BadRequestError(
      `Driver is already ${driver.status.toLowerCase()}.`,
    );
  }

  return updateDriverStatus(driverId, status);
};

module.exports = {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
  approveDriver,
};
