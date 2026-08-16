const {
  createDriver,
  getDriverByUserId,
  getDriverById,
  getDriverByLicenseNumber,
  getDriverByAadharNumber,
  updateDriver,
  updateDriverAvailability,
  updateDriverStatus,
  createDriverDocument,
  getDriverDocumentByType,
  getDriverDocuments: getDocumentsFromDB,
} = require("../repositories/driver.repository");

const { NotFoundError, BadRequestError } = require("../utils/AppError");
const { uploadImage } = require("./upload.service");

const { registerDriverSchema } = require("../validators/driver.validator");

const registerDriver = async (userId, data) => {
  const validatedData = data;
  validatedData.licenseNumber;
  validatedData.aadharNumber;
  validatedData.experience;

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

const uploadDriverDocument = async (driverId, data, file) => {
  const driver = await getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (!file) {
    throw new BadRequestError("Please upload a document.");
  }

  const existingDocument = await getDriverDocumentByType(
    driverId,
    data.documentType,
  );

  if (existingDocument) {
    throw new BadRequestError(`${data.documentType} document already exists.`);
  }

  const result = await uploadImage(file, "goride/driver-documents");

  return await createDriverDocument({
    driverId,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    fileUrl: result.secure_url,
    filePublicId: result.public_id,
  });
};

const getDriverDocuments = async (userId) => {
  const driver = await getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  return await getDocumentsFromDB(driver.id);
};

module.exports = {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
  approveDriver,
  uploadDriverDocument,
  getDriverDocuments,
};
