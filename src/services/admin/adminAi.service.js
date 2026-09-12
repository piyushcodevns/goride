const aiCore = require("../ai/aiCore.service");

const getStatus = () => aiCore.getAICoreStatus();

const getDemand = (options) => aiCore.getDemand(options);
const getPricing = (options) => aiCore.getPricing(options);
const getFare = (options) => aiCore.getFareIntelligence(options);
const getDriverPerformance = (options) =>
  aiCore.getDriverPerformance(options);
const getDriverPerformanceById = (driverId, options) =>
  aiCore.getDriverPerformanceById(driverId, options);
const getDriverRecommendations = (options) =>
  aiCore.getDriverRecommendations(options);
const getSupply = (options) => aiCore.getSupplyForecast(options);
const getVehicle = (options) => aiCore.getVehicleRecommendation(options);
const getRating = (options) => aiCore.getRatingPrediction(options);
const getCancellation = (options) =>
  aiCore.getCancellationPrediction(options);
const getChurn = (options) => aiCore.getChurnPrediction(options);
const getRevenue = (options) => aiCore.getRevenueForecast(options);
const getWeather = (options) => aiCore.getWeatherEffect(options);
const getFraud = (options) => aiCore.getFraudRiskIntelligence(options);
const getBusiness = (options) =>
  aiCore.getBusinessRecommendation(options);
const getEta = (options) => aiCore.getEtaPrediction(options);

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
