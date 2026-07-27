const {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
} = require("../services/driver.service");

const register = async (req, res) => {
  try {
    const driver = await registerDriver(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Driver registration submitted successfully. Waiting for admin approval.",
      data: driver,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const getProfile = async (req, res) => {
  try {
    const driver = await getDriverProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Driver profile fetched successfully.",
      data: driver,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const driver = await updateDriverProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Driver profile updated successfully.",
      data: driver,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateAvailabilityController = async (req, res) => {
  try {
    const driver = await updateAvailability(
      req.user.id,
      req.body.availability
    );

    return res.status(200).json({
      success: true,
      message: "Driver availability updated successfully.",
      data: driver,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  updateAvailabilityController,
};