const mapsService = require("../services/openRoute.service");
const {
  geocodeSchema,
  routeCoordinateSchema,
} = require("../validators/maps.validator");

const getCoordinates = async (req, res, next) => {
  try {
    const { address } = geocodeSchema.parse(req.query);

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
    const parsed = routeCoordinateSchema.parse({
      latitude: Number(req.query.latitude),
      longitude: Number(req.query.longitude),
    });

    const result = await mapsService.reverseGeocode(
      parsed.latitude,
      parsed.longitude,
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