const adminVehicleRepository = require("../../repositories/admin/adminVehicle.repository");
const {
  findVehicles,
  findVehicleById,
  findVehicleByNumber,
  updateVehicleWithAudit,
  approveVehicleWithAudit,
  rejectVehicleWithAudit,
  findVehicleDocuments,
  deleteVehicleWithAudit,
} = adminVehicleRepository;

const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require("../../utils/AppError");

/**
 * Get paginated vehicles.
 */
const getVehicles = async (filters) => {
  return findVehicles(filters);
};

/**
 * Get vehicle details.
 */
const getVehicleDetails = async (vehicleId) => {
  const vehicle = await findVehicleById(vehicleId);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  return vehicle;
};

/**
 * Update vehicle.
 */
const updateVehicle = async ({
  vehicleId,
  data,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const existingVehicle = await findVehicleById(vehicleId);

  if (!existingVehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  if (
    data.vehicleNumber &&
    data.vehicleNumber !== existingVehicle.vehicleNumber
  ) {
    const duplicateVehicle = await findVehicleByNumber(
      data.vehicleNumber,
    );

    if (duplicateVehicle && duplicateVehicle.id !== vehicleId) {
      throw new ConflictError("Vehicle number already exists.");
    }
  }

  const auditLog = {
    adminId,
    action: "UPDATE",
    entity: "VEHICLE",
    entityId: vehicleId,
    metadata: {
      previousData: {
        vehicleNumber: existingVehicle.vehicleNumber,
        vehicleType: existingVehicle.vehicleType,
        category: existingVehicle.category,
        status: existingVehicle.status,
        brand: existingVehicle.brand,
        model: existingVehicle.model,
        color: existingVehicle.color,
        seats: existingVehicle.seats,
      },
      updatedData: data,
    },
    ipAddress,
    userAgent,
  };

  return updateVehicleWithAudit({
    vehicleId,
    data,
    auditLog,
  });
};

/**
 * Approve vehicle.
 */
const approveVehicle = async ({
  vehicleId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const existingVehicle = await findVehicleById(vehicleId);

  if (!existingVehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  if (existingVehicle.status === "APPROVED") {
    throw new ConflictError("Vehicle is already approved.");
  }

  const auditLog = {
    adminId,
    action: "APPROVE",
    entity: "VEHICLE",
    entityId: vehicleId,
    metadata: {
      previousStatus: existingVehicle.status,
      newStatus: "APPROVED",
    },
    ipAddress,
    userAgent,
  };

  return approveVehicleWithAudit({
    vehicleId,
    auditLog,
  });
};

/**
 * Reject vehicle.
 */
const rejectVehicle = async ({
  vehicleId,
  rejectionReason,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const existingVehicle = await findVehicleById(vehicleId);

  if (!existingVehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  if (existingVehicle.status === "REJECTED") {
    throw new ConflictError("Vehicle is already rejected.");
  }

  const auditLog = {
    adminId,
    action: "REJECT",
    entity: "VEHICLE",
    entityId: vehicleId,
    metadata: {
      previousStatus: existingVehicle.status,
      newStatus: "REJECTED",
      rejectionReason,
    },
    ipAddress,
    userAgent,
  };

  return rejectVehicleWithAudit({
    vehicleId,
    rejectionReason,
    auditLog,
  });
};

/**
 * Get vehicle documents.
 */
const getVehicleDocuments = async (vehicleId) => {
  const vehicle = await findVehicleById(vehicleId);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  return findVehicleDocuments(vehicleId);
};

/**
 * Delete vehicle.
 */
const deleteVehicle = async ({
  vehicleId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const existingVehicle = await findVehicleById(vehicleId);

  if (!existingVehicle) {
    throw new NotFoundError("Vehicle not found.");
  }

  const auditLog = {
    adminId,
    action: "DELETE",
    entity: "VEHICLE",
    entityId: vehicleId,
    metadata: {
      deletedVehicle: {
        driverId: existingVehicle.driverId,
        vehicleNumber: existingVehicle.vehicleNumber,
        vehicleType: existingVehicle.vehicleType,
        category: existingVehicle.category,
        status: existingVehicle.status,
        brand: existingVehicle.brand,
        model: existingVehicle.model,
        color: existingVehicle.color,
        seats: existingVehicle.seats,
      },
    },
    ipAddress,
    userAgent,
  };

  return deleteVehicleWithAudit({
    vehicleId,
    auditLog,
  });
};

/**
 * Approve vehicle document.
 */
const approveVehicleDocument = async ({
  documentId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const document = await adminVehicleRepository.findVehicleDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Vehicle document not found.");
  }

  if (document.status === "APPROVED") {
    throw new ConflictError("Vehicle document is already approved.");
  }

  if (document.status === "REJECTED") {
    throw new ConflictError(
      "Rejected vehicle document cannot be approved directly. Upload a new document."
    );
  }

  const auditLog = {
    adminId,
    action: "APPROVE",
    entity: "VEHICLE",
    entityId: document.vehicleId,
    metadata: {
      documentId,
      documentType: document.documentType,
      previousStatus: document.status,
      newStatus: "APPROVED",
    },
    ipAddress,
    userAgent,
  };

  return adminVehicleRepository.updateVehicleDocumentStatusWithAudit({
    documentId,
    status: "APPROVED",
    rejectionReason: null,
    auditLog,
  });
};

/**
 * Reject vehicle document.
 */
const rejectVehicleDocument = async ({
  documentId,
  reason,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const document = await adminVehicleRepository.findVehicleDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Vehicle document not found.");
  }

  if (document.status === "REJECTED") {
    throw new ConflictError("Vehicle document is already rejected.");
  }

  if (!reason || !reason.trim()) {
    throw new BadRequestError("Rejection reason is required.");
  }

  const auditLog = {
    adminId,
    action: "REJECT",
    entity: "VEHICLE",
    entityId: document.vehicleId,
    metadata: {
      documentId,
      documentType: document.documentType,
      previousStatus: document.status,
      newStatus: "REJECTED",
      rejectionReason: reason.trim(),
    },
    ipAddress,
    userAgent,
  };

  return adminVehicleRepository.updateVehicleDocumentStatusWithAudit({
    documentId,
    status: "REJECTED",
    rejectionReason: reason.trim(),
    auditLog,
  });
};

module.exports = {
  getVehicles,
  getVehicleDetails,
  updateVehicle,
  approveVehicle,
  rejectVehicle,
  getVehicleDocuments,
  approveVehicleDocument,
  rejectVehicleDocument,
  deleteVehicle,
};
