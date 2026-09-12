const adminAiService = require("../../services/admin/adminAi.service");

const respond = (serviceMethod, getArguments) => async (req, res, next) => {
  try {
    const result = await serviceMethod(...getArguments(req));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const getStatus = respond(adminAiService.getStatus, () => []);
const getDemand = respond(adminAiService.getDemand, (req) => [req.query]);
const getPricing = respond(adminAiService.getPricing, (req) => [req.query]);
const getFare = respond(adminAiService.getFare, (req) => [req.query]);
const getDriverPerformance = respond(
  adminAiService.getDriverPerformance,
  (req) => [req.query],
);
const getDriverPerformanceById = respond(
  adminAiService.getDriverPerformanceById,
  (req) => [req.params.driverId, req.query],
);
const getDriverRecommendations = respond(
  adminAiService.getDriverRecommendations,
  (req) => [req.query],
);
const getSupply = respond(adminAiService.getSupply, (req) => [req.query]);
const getVehicle = respond(adminAiService.getVehicle, (req) => [req.query]);
const getRating = respond(adminAiService.getRating, (req) => [req.query]);
const getCancellation = respond(
  adminAiService.getCancellation,
  (req) => [req.query],
);
const getChurn = respond(adminAiService.getChurn, (req) => [req.query]);
const getRevenue = respond(adminAiService.getRevenue, (req) => [req.query]);
const getWeather = respond(adminAiService.getWeather, (req) => [req.query]);
const getFraud = respond(adminAiService.getFraud, (req) => [req.query]);
const getBusiness = respond(adminAiService.getBusiness, (req) => [req.query]);
const getEta = respond(adminAiService.getEta, (req) => [req.query]);

module.exports = {
  getStatus,
  getDemand,
  getPricing,
  getFare,
  getDriverPerformance,
  getDriverPerformanceById,
  getDriverRecommendations,
  getSupply,
  getVehicle,
  getRating,
  getCancellation,
  getChurn,
  getRevenue,
  getWeather,
  getFraud,
  getBusiness,
  getEta,
};