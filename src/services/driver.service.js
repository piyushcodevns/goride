const driverRepository = require("../repositories/driver.repository");
const storageService = require("./storage.service");

const {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} = require("../utils/AppError");
const { validateDocumentFile } = require("../utils/fileSecurity");
const logger = require("../utils/logger");
const {
  updateDriverProfileSchema,
  updateDriverAvailabilitySchema,
} = require("../validators/driver.validator");

const registerDriver = async (userId, data) => {
  const existingDriver = await driverRepository.getDriverByUserId(userId);

  if (existingDriver) {
    throw new BadRequestError("Driver profile already exists.");
  }

  const licenseExists = await driverRepository.getDriverByLicenseNumber(data.licenseNumber);

  if (licenseExists) {
    throw new BadRequestError("License number already registered.");
  }

  const aadharExists = await driverRepository.getDriverByAadharNumber(data.aadharNumber);

  if (aadharExists) {
    throw new BadRequestError("Aadhar number already registered.");
  }

  return driverRepository.createDriver({
    userId,
    licenseNumber: data.licenseNumber,
    aadharNumber: data.aadharNumber,
    experience: data.experience,
  });
};

const getDriverProfile = async (userId) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  return driver;
};

const updateDriverProfile = async (userId, data) => {
  const validatedData = updateDriverProfileSchema.parse({
    body: data,
  }).body;

  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  if (
    validatedData.licenseNumber &&
    validatedData.licenseNumber !== driver.licenseNumber
  ) {
    const licenseExists = await driverRepository.getDriverByLicenseNumber(
      validatedData.licenseNumber,
    );

    if (licenseExists) {
      throw new BadRequestError("License number already registered.");
    }
  }

  if (
    validatedData.aadharNumber &&
    validatedData.aadharNumber !== driver.aadharNumber
  ) {
    const aadharExists = await driverRepository.getDriverByAadharNumber(
      validatedData.aadharNumber,
    );

    if (aadharExists) {
      throw new BadRequestError("Aadhar number already registered.");
    }
  }

  return driverRepository.updateDriver(driver.id, validatedData);
};

const updateAvailability = async (userId, availability) => {
  updateDriverAvailabilitySchema.parse({
    body: { availability },
  });

  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  if (driver.status !== "APPROVED") {
    throw new BadRequestError(
      "Only approved drivers can update availability status.",
    );
  }

  return driverRepository.updateDriverAvailability(driver.id, availability);
};

const approveDriver = async (driverId, status) => {
  const driver = await driverRepository.getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status === status) {
    throw new BadRequestError(
      `Driver is already ${driver.status.toLowerCase()}.`,
    );
  }

  return driverRepository.updateDriverStatus(driverId, status);
};

const uploadDriverDocument = async (driverId, data, file) => {
  const driver = await driverRepository.getDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (!file) {
    throw new BadRequestError("Please upload a document.");
  }

  const { isPdf } = validateDocumentFile(file);

  const existingDocument = await driverRepository.getDriverDocumentByType(
    driverId,
    data.documentType,
  );

  if (existingDocument && existingDocument.status !== "REJECTED") {
    throw new BadRequestError(`${data.documentType} document already exists.`);
  }

  // 1. Upload to storage
  const uploadResult = await storageService.uploadStream(file.buffer, {
    folder: "goride/driver-documents",
    resourceType: isPdf ? "auto" : "image",
    tags: ["goride", "driver-document", `driver_${driverId}`],
  });

  // 2. Persist in DB with failure compensation
  let savedDocument;
  try {
    if (existingDocument) {
      savedDocument = await driverRepository.replaceRejectedDriverDocument({
        documentId: existingDocument.id,
        documentNumber: data.documentNumber,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
      });
    } else {
      savedDocument = await driverRepository.createDriverDocument({
        driverId,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
      });
    }
  } catch (dbError) {
    // Compensation on DB failure
    if (uploadResult.public_id) {
      await storageService.deleteResource(uploadResult.public_id, {
        resourceType: uploadResult.resource_type || "image",
      });
    }
    throw dbError;
  }

  // 3. Delete old file only after DB update succeeds
  if (
    existingDocument &&
    existingDocument.filePublicId &&
    existingDocument.filePublicId !== uploadResult.public_id
  ) {
    try {
      await storageService.deleteResource(existingDocument.filePublicId, {
        resourceType: "auto",
      });
    } catch (cleanupError) {
      logger.warn(`[DRIVER DOC CLEANUP] Failed to cleanup replaced document: ${existingDocument.filePublicId}`);
    }
  }

  return savedDocument;
};

const deleteDriverDocument = async (driverId, documentId) => {
  const document = await driverRepository.getDriverDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Driver document not found.");
  }

  if (document.driverId !== driverId) {
    throw new ForbiddenError("You are not authorized to delete this document.");
  }

  if (document.status === "APPROVED") {
    throw new ConflictError("Approved driver document cannot be deleted.");
  }

  await driverRepository.deleteDriverDocument(documentId);

  if (document.filePublicId) {
    await storageService.deleteResource(document.filePublicId, {
      resourceType: "auto",
    });
  }

  return { message: "Driver document deleted successfully." };
};

const getDriverDocuments = async (userId) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  return await driverRepository.getDriverDocuments(driver.id);
};

module.exports = {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
  approveDriver,
  uploadDriverDocument,
  deleteDriverDocument,
  getDriverDocuments,
};
