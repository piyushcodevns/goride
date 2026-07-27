const {
  addVehicle,
  getVehicle,
  updateMyVehicle,
  deleteMyVehicle,
} = require("../services/vehicle.service");

const registerVehicle = async (req, res) => {
  try {
    const vehicle = await addVehicle(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully.",
      data: vehicle,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyVehicle = async (req, res) => {
  try {
    const vehicle = await getVehicle(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully.",
      data: vehicle,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateMyVehicleController = async (req, res) => {
  try {
    const vehicle = await updateMyVehicle(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully.",
      data: vehicle,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteMyVehicleController = async (req, res) => {
  try {
    await deleteMyVehicle(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerVehicle,
  getMyVehicle,
  updateMyVehicleController,
  deleteMyVehicleController,
};