const vehicleRepository = require("../repositories/vehicle.repository");
const driverRepository = require("../repositories/driver.repository");
const storageService = require("./storage.service");

const { validateDocumentFile } = require("../utils/fileSecurity");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} = require("../utils/AppError");
const logger = require("../utils/logger");

const {
  createVehicleSchema,
  updateVehicleSchema,
} = require("../validators/vehicle.validator");

const ALLOWED_VEHICLE_DOCUMENT_TYPES = ["RC", "INSURANCE", "PERMIT", "FITNESS"];

// Add Vehicle
const addVehicle = async (userId, data) => {
  const validatedData = createVehicleSchema.parse(data);

  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const existingVehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (existingVehicle) {
    throw new BadRequestError("Driver already has a registered vehicle.");
  }

  const vehicleNumberExists = await vehicleRepository.getVehicleByNumber(
    validatedData.vehicleNumber,
  );

  if (vehicleNumberExists) {
    throw new BadRequestError("Vehicle number already exists.");
  }

  return vehicleRepository.createVehicle({
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
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  return vehicle;
};

// Update My Vehicle
const updateMyVehicle = async (userId, data) => {
  const validatedData = updateVehicleSchema.parse(data);

  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  if (
    validatedData.vehicleNumber &&
    validatedData.vehicleNumber !== vehicle.vehicleNumber
  ) {
    const existingVehicle = await vehicleRepository.getVehicleByNumber(
      validatedData.vehicleNumber,
    );

    if (existingVehicle) {
      throw new BadRequestError("Vehicle number already exists.");
    }
  }

  return vehicleRepository.updateVehicle(driver.id, validatedData);
};

// Delete My Vehicle
const deleteMyVehicle = async (userId) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  return vehicleRepository.deleteVehicle(driver.id);
};

// ==========================================
// Vehicle Document Operations
// ==========================================

const uploadVehicleDocument = async (userId, data, file) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found. Register a vehicle first.");
  }

  if (!file) {
    throw new BadRequestError("Please upload a vehicle document.");
  }

  if (!data || !data.documentType) {
    throw new BadRequestError("Document type is required.");
  }

  if (!ALLOWED_VEHICLE_DOCUMENT_TYPES.includes(data.documentType)) {
    throw new BadRequestError(
      `Invalid document type. Allowed types: ${ALLOWED_VEHICLE_DOCUMENT_TYPES.join(", ")}`
    );
  }

  const { isPdf } = validateDocumentFile(file);

  const existingDocument = await vehicleRepository.getVehicleDocumentByType(
    vehicle.id,
    data.documentType
  );

  if (existingDocument && existingDocument.status !== "REJECTED") {
    throw new BadRequestError(`${data.documentType} document already exists.`);
  }

  // 1. Upload to storage
  const uploadResult = await storageService.uploadStream(file.buffer, {
    folder: "goride/vehicle-documents",
    resourceType: isPdf ? "auto" : "image",
    tags: ["goride", "vehicle-document", `vehicle_${vehicle.id}`],
  });

  // 2. Persist with failure compensation
  let savedDocument;
  try {
    if (existingDocument) {
      savedDocument = await vehicleRepository.updateVehicleDocument(existingDocument.id, {
        documentNumber: data.documentNumber ? String(data.documentNumber).trim() : null,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
        status: "PENDING",
        rejectionReason: null,
      });
    } else {
      savedDocument = await vehicleRepository.createVehicleDocument({
        vehicleId: vehicle.id,
        documentType: data.documentType,
        documentNumber: data.documentNumber ? String(data.documentNumber).trim() : null,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
      });
    }
  } catch (dbError) {
    if (uploadResult.public_id) {
      await storageService.deleteResource(uploadResult.public_id, {
        resourceType: uploadResult.resource_type || "image",
      });
    }
    throw dbError;
  }

  // 3. Delete old file if replacement
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
      logger.warn(`[VEHICLE DOC CLEANUP] Failed to cleanup replaced document: ${existingDocument.filePublicId}`);
    }
  }

  return savedDocument;
};

const getVehicleDocuments = async (userId) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  return vehicleRepository.getVehicleDocuments(vehicle.id);
};

const deleteVehicleDocument = async (userId, documentId) => {
  const driver = await driverRepository.getDriverByUserId(userId);

  if (!driver) {
    throw new NotFoundError("Driver profile not found.");
  }

  const vehicle = await vehicleRepository.getVehicleByDriverId(driver.id);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  const document = await vehicleRepository.getVehicleDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Vehicle document not found.");
  }

  if (document.vehicleId !== vehicle.id) {
    throw new ForbiddenError("You are not authorized to delete this document.");
  }

  if (document.status === "APPROVED") {
    throw new ConflictError("Approved vehicle document cannot be deleted.");
  }

  await vehicleRepository.deleteVehicleDocument(documentId);

  if (document.filePublicId) {
    await storageService.deleteResource(document.filePublicId, {
      resourceType: "auto",
    });
  }

  return { message: "Vehicle document deleted successfully." };
};

module.exports = {
  addVehicle,
  getVehicle,
  updateMyVehicle,
  deleteMyVehicle,
  uploadVehicleDocument,
  getVehicleDocuments,
  deleteVehicleDocument,
};
