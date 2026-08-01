const {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
  approveDriver,
} = require("../services/driver.service");

const register = async (req, res, next) => {
  try {
    const driver = await registerDriver(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message:
        "Driver registration submitted successfully. Waiting for admin approval.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};
const getProfile = async (req, res, next) => {
  try {
    const driver = await getDriverProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Driver profile fetched successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const driver = await updateDriverProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Driver profile updated successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

const updateAvailabilityController = async (req, res, next) => {
  try {
    const driver = await updateAvailability(req.user.id, req.body.availability);

    return res.status(200).json({
      success: true,
      message: "Driver availability updated successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

const approveDriverController = async (req, res, next) => {
  try {
    const driver = await approveDriver(req.params.driverId, req.body.status);

    return res.status(200).json({
      success: true,
      message: `Driver ${req.body.status.toLowerCase()} successfully.`,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  updateAvailabilityController,
  approveDriverController,
};
