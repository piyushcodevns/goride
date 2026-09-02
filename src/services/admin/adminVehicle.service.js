const {
  findVehicles,
  findVehicleById,
  findVehicleByNumber,
  updateVehicleWithAudit,
  approveVehicleWithAudit,
  rejectVehicleWithAudit,
  findVehicleDocuments,
  deleteVehicleWithAudit,
} = require("../../repositories/admin/adminVehicle.repository");

const {
  NotFoundError,
  ConflictError,
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

module.exports = {
  getVehicles,
  getVehicleDetails,
  updateVehicle,
  approveVehicle,
  rejectVehicle,
  getVehicleDocuments,
  deleteVehicle,
};
