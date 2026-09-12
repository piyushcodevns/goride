const {
  addVehicle,
  getVehicle,
  updateMyVehicle,
  deleteMyVehicle,
  uploadVehicleDocument,
  getVehicleDocuments,
  deleteVehicleDocument,
} = require("../services/vehicle.service");

// Register Vehicle
const registerVehicle = async (req, res, next) => {
  try {
    const vehicle = await addVehicle(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// Get My Vehicle
const getMyVehicle = async (req, res, next) => {
  try {
    const vehicle = await getVehicle(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// Update My Vehicle
const updateMyVehicleController = async (req, res, next) => {
  try {
    const vehicle = await updateMyVehicle(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// Delete My Vehicle
const deleteMyVehicleController = async (req, res, next) => {
  try {
    const vehicle = await deleteMyVehicle(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// Vehicle Document Handlers
const uploadDocumentController = async (req, res, next) => {
  try {
    const document = await uploadVehicleDocument(req.user.id, req.body, req.file);

    return res.status(201).json({
      success: true,
      message: "Vehicle document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const getDocumentsController = async (req, res, next) => {
  try {
    const documents = await getVehicleDocuments(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Vehicle documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

const deleteDocumentController = async (req, res, next) => {
  try {
    const result = await deleteVehicleDocument(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVehicle,
  getMyVehicle,
  updateMyVehicleController,
  deleteMyVehicleController,
  uploadDocumentController,
  getDocumentsController,
  deleteDocumentController,
};