const {
  getVehicles,
  getVehicleDetails,
  updateVehicle,
  approveVehicle,
  rejectVehicle,
  getVehicleDocuments,
  approveVehicleDocument,
  rejectVehicleDocument,
  deleteVehicle,
} = require("../../services/admin/adminVehicle.service");

const {
  vehicleIdParamSchema,
  getVehiclesQuerySchema,
  updateVehicleSchema,
  rejectVehicleSchema,
  documentIdParamSchema,
  documentRejectBodySchema,
} = require("../../validators/admin/adminVehicle.validator");

/**
 * Get all vehicles.
 */
const getAllVehicles = async (req, res, next) => {
  try {
    const query = getVehiclesQuerySchema.parse(req.query);

    const result = await getVehicles(query);

    return res.status(200).json({
      success: true,
      message: "Vehicles fetched successfully.",
      data: {
        items: result.vehicles,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vehicle details.
 */
const getVehicle = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);

    const vehicle = await getVehicleDetails(id);

    return res.status(200).json({
      success: true,
      message: "Vehicle details fetched successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vehicle.
 */
const updateVehicleController = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);
    const data = updateVehicleSchema.parse(req.body);

    const vehicle = await updateVehicle({
      vehicleId: id,
      data,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve vehicle.
 */
const approveVehicleController = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);

    const vehicle = await approveVehicle({
      vehicleId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle approved successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject vehicle.
 */
const rejectVehicleController = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);
    const { rejectionReason } = rejectVehicleSchema.parse(req.body);

    const vehicle = await rejectVehicle({
      vehicleId: id,
      rejectionReason,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle rejected successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vehicle documents.
 */
const getVehicleDocumentsController = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);

    const documents = await getVehicleDocuments(id);

    return res.status(200).json({
      success: true,
      message: "Vehicle documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete vehicle.
 */
const deleteVehicleController = async (req, res, next) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);

    const vehicle = await deleteVehicle({
      vehicleId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve vehicle document.
 */
const approveVehicleDocumentController = async (req, res, next) => {
  try {
    const { id } = documentIdParamSchema.parse(req.params);

    const document = await approveVehicleDocument({
      documentId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle document approved successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject vehicle document.
 */
const rejectVehicleDocumentController = async (req, res, next) => {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const { reason } = documentRejectBodySchema.parse(req.body);

    const document = await rejectVehicleDocument({
      documentId: id,
      reason,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle document rejected successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVehicles,
  getVehicle,
  updateVehicleController,
  approveVehicleController,
  rejectVehicleController,
  getVehicleDocumentsController,
  approveVehicleDocumentController,
  rejectVehicleDocumentController,
  deleteVehicleController,
};
