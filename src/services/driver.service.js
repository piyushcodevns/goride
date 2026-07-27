const {
  createDriver,
  getDriverByUserId,
  getDriverByLicenseNumber,
  getDriverByAadharNumber,
  updateDriver,
  updateDriverAvailability,
} = require("../repositories/driver.repository");

const { registerDriverSchema } = require("../validators/driver.validator");

const registerDriver = async (userId, data) => {
  const validatedData = registerDriverSchema.parse(data);

  const existingDriver = await getDriverByUserId(userId);

  if (existingDriver) {
    throw new Error("Driver profile already exists.");
  }

  const licenseExists = await getDriverByLicenseNumber(
    validatedData.licenseNumber,
  );

  if (licenseExists) {
    throw new Error("License number already exists.");
  }

  const aadharExists = await getDriverByAadharNumber(
    validatedData.aadharNumber,
  );

  if (aadharExists) {
    throw new Error("Aadhar number already exists.");
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
    throw new Error("Driver profile not found.");
  }

  return driver;
};

const updateDriverProfile = async (userId, data) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Update driver
  return await updateDriver(userId, data);
};

const updateAvailability = async (userId, availability) => {
  // Check driver exists
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new Error("Driver profile not found.");
  }

  // Update availability
  return await updateDriverAvailability(userId, availability);
};

module.exports = {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
};
