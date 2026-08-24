const {
  findDrivers,
  findPendingDrivers,
  findDriverById,
  findDriverVehicle,
  findDriverTrips,
  findDriverRatings,
  findDriverEarnings,
  findDriverKyc,
  findDriverApprovalEligibility,
  findDriverStatistics,
  updateDriverStatusWithAudit,

  findDriverDocuments,
  findDriverDocumentById,
  updateDriverDocumentStatusWithAudit,
  findDriverWallet,
  findDriverWalletTransactions,
} = require("../../repositories/admin/adminDriver.repository");

const { NotFoundError, ConflictError } = require("../../utils/AppError");

const REQUIRED_DRIVER_DOCUMENTS = ["LICENSE", "AADHAAR", "RC", "INSURANCE"];

const assertDriverApprovalEligibility = (driver) => {
  if (!driver.user.isActive) {
    throw new ConflictError(
      "Driver cannot be approved because the user account is inactive.",
    );
  }

  if (driver.user.isBlocked) {
    throw new ConflictError(
      "Driver cannot be approved because the user account is blocked.",
    );
  }

  if (driver.user.deletedAt) {
    throw new ConflictError(
      "Driver cannot be approved because the user account is deleted.",
    );
  }

  const approvedDocuments = new Set(
    driver.documents
      .filter((document) => document.status === "APPROVED")
      .map((document) => document.documentType),
  );
  const missingDocuments = REQUIRED_DRIVER_DOCUMENTS.filter(
    (documentType) => !approvedDocuments.has(documentType),
  );

  if (missingDocuments.length > 0) {
    throw new ConflictError(
      `Driver cannot be approved. Required documents are not approved: ${missingDocuments.join(", ")}.`,
    );
  }
};

/**
 * Get paginated drivers.
 */
const getDrivers = async (filters) => {
  return findDrivers(filters);
};

/**
 * Get pending drivers.
 */
const getPendingDrivers = async (pagination) => {
  return findPendingDrivers(pagination);
};

/**
 * Get complete driver details.
 */
const getDriverDetails = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return driver;
};

/**
 * Get driver's vehicle.
 */
const getDriverVehicle = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  const vehicle = await findDriverVehicle(driverId);

  if (!vehicle) {
    throw new NotFoundError("Vehicle not found for this driver.");
  }

  return vehicle;
};

/**
 * Get driver's trip history.
 */
const getDriverTrips = async (driverId, pagination) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return findDriverTrips({
    driverId,
    ...pagination,
  });
};

/**
 * Get driver's ratings and reviews.
 */
const getDriverRatings = async (driverId, pagination) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return findDriverRatings({
    driverId,
    ...pagination,
  });
};

/**
 * Get driver's KYC information.
 */
const getDriverKyc = async (driverId) => {
  const driver = await findDriverKyc(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return driver;
};

/**
 * Get driver statistics.
 */
const getDriverStatistics = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return findDriverStatistics(driverId);
};

/**
 * Get driver's earnings summary.
 */
const getDriverEarnings = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return findDriverEarnings(driverId);
};

/**
 * Approve driver.
 */
const approveDriver = async ({ driverId, adminId, ipAddress, userAgent }) => {
  const driver = await findDriverApprovalEligibility(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status === "APPROVED") {
    throw new ConflictError("Driver is already approved.");
  }

  if (driver.status === "SUSPENDED") {
    throw new ConflictError(
      "Suspended driver cannot be approved. Activate the driver instead.",
    );
  }

  if (driver.status === "REJECTED") {
    throw new ConflictError("Rejected driver cannot be approved directly.");
  }

  assertDriverApprovalEligibility(driver);

  const updatedDriver = await updateDriverStatusWithAudit({
    driverId,
    expectedStatus: driver.status,
    status: "APPROVED",
    availability: "OFFLINE",

    auditLog: {
      adminId,
      action: "APPROVE",
      entity: "DRIVER",
      entityId: driverId,
      metadata: {
        previousStatus: driver.status,
        newStatus: "APPROVED",
      },
      ipAddress,
      userAgent,
    },
  });

  if (!updatedDriver) {
    throw new ConflictError(
      "Driver status changed by another admin. Please refresh and try again.",
    );
  }

  return updatedDriver;
};

/**
 * Reject driver.
 */
const rejectDriver = async ({
  driverId,
  adminId,
  reason,
  ipAddress,
  userAgent,
}) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status === "REJECTED") {
    throw new ConflictError("Driver is already rejected.");
  }

  if (driver.status === "APPROVED") {
    throw new ConflictError(
      "Approved driver cannot be rejected. Suspend the driver instead.",
    );
  }

  if (driver.status === "SUSPENDED") {
    throw new ConflictError("Suspended driver cannot be rejected.");
  }

  const updatedDriver = await updateDriverStatusWithAudit({
    driverId,
    expectedStatus: driver.status,
    status: "REJECTED",
    availability: "OFFLINE",

    auditLog: {
      adminId,
      action: "REJECT",
      entity: "DRIVER",
      entityId: driverId,
      metadata: {
        previousStatus: driver.status,
        newStatus: "REJECTED",
        reason,
      },
      ipAddress,
      userAgent,
    },
  });

  if (!updatedDriver) {
    throw new ConflictError(
      "Driver status changed by another admin. Please refresh and try again.",
    );
  }

  return updatedDriver;
};

/**
 * Suspend driver.
 */
const suspendDriver = async ({
  driverId,
  adminId,
  reason,
  ipAddress,
  userAgent,
}) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status === "SUSPENDED") {
    throw new ConflictError("Driver is already suspended.");
  }

  if (driver.status !== "APPROVED") {
    throw new ConflictError("Only an approved driver can be suspended.");
  }

  const updatedDriver = await updateDriverStatusWithAudit({
    driverId,
    expectedStatus: driver.status,
    status: "SUSPENDED",
    availability: "OFFLINE",

    auditLog: {
      adminId,
      action: "SUSPEND",
      entity: "DRIVER",
      entityId: driverId,
      metadata: {
        previousStatus: driver.status,
        newStatus: "SUSPENDED",
        reason,
      },
      ipAddress,
      userAgent,
    },
  });

  if (!updatedDriver) {
    throw new ConflictError(
      "Driver status changed by another admin. Please refresh and try again.",
    );
  }

  return updatedDriver;
};

/**
 * Activate suspended driver.
 */
const activateDriver = async ({ driverId, adminId, ipAddress, userAgent }) => {
  const driver = await findDriverApprovalEligibility(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  if (driver.status === "APPROVED") {
    throw new ConflictError("Driver is already active.");
  }

  if (driver.status !== "SUSPENDED") {
    throw new ConflictError("Only a suspended driver can be activated.");
  }

  assertDriverApprovalEligibility(driver);

  const updatedDriver = await updateDriverStatusWithAudit({
    driverId,
    expectedStatus: driver.status,
    status: "APPROVED",
    availability: "OFFLINE",

    auditLog: {
      adminId,
      action: "ACTIVATE",
      entity: "DRIVER",
      entityId: driverId,
      metadata: {
        previousStatus: driver.status,
        newStatus: "APPROVED",
      },
      ipAddress,
      userAgent,
    },
  });

  if (!updatedDriver) {
    throw new ConflictError(
      "Driver status changed by another admin. Please refresh and try again.",
    );
  }

  return updatedDriver;
};

/**
 * Get driver documents.
 */
const getDriverDocuments = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  return findDriverDocuments(driverId);
};

const approveDriverDocument = async ({
  documentId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  const document = await findDriverDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Driver document not found.");
  }

  if (document.status === "APPROVED") {
    throw new ConflictError("Driver document is already approved.");
  }

  if (document.status === "REJECTED") {
    throw new ConflictError(
      "Rejected driver document cannot be approved directly. Upload a new document.",
    );
  }

  const updatedDocument = await updateDriverDocumentStatusWithAudit({
    documentId,
    status: "APPROVED",
    rejectionReason: null,

    auditLog: {
      adminId,
      action: "APPROVE",
      entity: "DRIVER",
      entityId: document.driverId,
      metadata: {
        documentId,
        documentType: document.documentType,
        previousStatus: document.status,
        newStatus: "APPROVED",
      },
      ipAddress,
      userAgent,
    },
  });

  return updatedDocument;
};

const rejectDriverDocument = async ({
  documentId,
  adminId,
  reason,
  ipAddress,
  userAgent,
}) => {
  const document = await findDriverDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("Driver document not found.");
  }

  if (document.status === "REJECTED") {
    throw new ConflictError("Driver document is already rejected.");
  }

  if (document.status === "APPROVED") {
    throw new ConflictError(
      "Approved driver document cannot be rejected.",
    );
  }

  const updatedDocument = await updateDriverDocumentStatusWithAudit({
    documentId,
    status: "REJECTED",
    rejectionReason: reason,

    auditLog: {
      adminId,
      action: "REJECT",
      entity: "DRIVER",
      entityId: document.driverId,
      metadata: {
        documentId,
        documentType: document.documentType,
        previousStatus: document.status,
        newStatus: "REJECTED",
        reason,
      },
      ipAddress,
      userAgent,
    },
  });

  return updatedDocument;
};

const getDriverWallet = async (driverId) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  const wallet = await findDriverWallet(driverId);

  if (!wallet) {
    throw new NotFoundError("Driver wallet not found.");
  }

  return wallet;
};

const getDriverWalletTransactions = async (driverId, pagination) => {
  const driver = await findDriverById(driverId);

  if (!driver) {
    throw new NotFoundError("Driver not found.");
  }

  const result = await findDriverWalletTransactions({
    driverId,
    ...pagination,
  });

  if (!result) {
    throw new NotFoundError("Driver wallet not found.");
  }

  return result;
};

module.exports = {
  getDrivers,
  getPendingDrivers,
  getDriverDetails,
  getDriverVehicle,
  getDriverTrips,
  getDriverRatings,
  getDriverKyc,
  getDriverStatistics,
  getDriverEarnings,
  approveDriver,
  rejectDriver,
  suspendDriver,
  activateDriver,

  getDriverDocuments,
  approveDriverDocument,
  rejectDriverDocument,
  getDriverWallet,
  getDriverWalletTransactions,
};
