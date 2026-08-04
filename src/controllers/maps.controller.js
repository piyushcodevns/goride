const mapsService = require("../services/openRoute.service");

const getCoordinates = async (req, res, next) => {
  try {
    const { address } = req.query;

    const result = await mapsService.geocodeAddress(address);

    return res.status(200).json({
      success: true,
      message: "Coordinates fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAddress = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;

    const result = await mapsService.reverseGeocode(
      latitude,
      longitude
    );

    return res.status(200).json({
      success: true,
      message: "Address fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCoordinates,
  getAddress,
};