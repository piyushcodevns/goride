const {
  getDemandPrediction,
} = require("../../ai/services/demandPrediction.service");

const { getPricingSignal } = require("./pricingSignal.service");

const {
  getDriverPerformance: getDriverPerformanceService,
  getDriverPerformanceById: getDriverPerformanceByIdService,
} = require("./driverPerformance.service");

const { recommendDriversForRide } = require("./driverRecommendation.service");

const {
  buildBlockedFeatureResponse,
  BLOCKED_FEATURES,
} = require("../../ai/utils/aiFeatureGuards");

const {
  getFareIntelligence: getFareIntelligenceService,
} = require("./fareIntelligence.service");

const { getSupplyForecast: getSupplyForecastService } = require("./supplyForecast.service");

const {
  getVehicleRecommendation: getVehicleRecommendationService,
} = require("./vehicleRecommendation.service");

const { getRatingPrediction: getRatingPredictionService } = require("./ratingPrediction.service");

const {
  getCancellationPrediction: getCancellationPredictionService,
} = require("./cancellationPrediction.service");

const {
  getChurnPrediction: getChurnPredictionService,
} = require("./churnPrediction.service");

const {
  getRevenueForecast: getRevenueForecastService,
} = require("./revenueForecast.service");

const {
  getWeatherEffectPrediction: getWeatherEffectPredictionService,
} = require("./weatherEffect.service");

const {
  getFraudRiskIntelligence: getFraudRiskIntelligenceService,
} = require("./fraudRisk.service");

const {
  getBusinessRecommendations,
} = require("./businessRecommendation.service");

const getAICoreStatus = () => {
  return {
    status: "READY",
    modelVersion: "goride-ai-v1",
    features: {
      demandForecast: "AVAILABLE",
      pricingSignal: "AVAILABLE",
      fareIntelligence: "AVAILABLE",
      driverPerformance: "AVAILABLE",
      driverRecommendation: "AVAILABLE",
      vehicleRecommendation: "AVAILABLE",
      ratingPrediction: "AVAILABLE",
      cancellationPrediction: "AVAILABLE",
      churnPrediction: "DATA_DEPENDENT",
      revenueForecast: "AVAILABLE",
      weatherEffect: "BLOCKED",
      fraudRiskIntelligence: "AVAILABLE",
      businessRecommendationIntelligence: "AVAILABLE",
      supplyForecast: "DATA_DEPENDENT",
      etaPrediction: "BLOCKED",
    },
  };
};

const getDemand = async (options = {}) => {
  return getDemandPrediction(options);
};

const getPricing = async (options = {}) => {
  return getPricingSignal(options);
};

const getFareIntelligence = async (options = {}) => {
  return getFareIntelligenceService(options);
};

const getDriverPerformance = async (options = {}) => {
  return getDriverPerformanceService(options);
};

const getDriverPerformanceById = async (driverId, options = {}) => {
  return getDriverPerformanceByIdService(driverId, options);
};

const getDriverRecommendations = async (options = {}) => {
  return recommendDriversForRide(options);
};

const getBlockedPrediction = (feature) => {
  return buildBlockedFeatureResponse({
    feature,
    reason: "FEATURE_NOT_AVAILABLE",
  });
};

const getEtaPrediction = () => {
  return getBlockedPrediction(BLOCKED_FEATURES.ETA_PREDICTION);
};

const getCancellationPrediction = async (options = {}) => {
  return getCancellationPredictionService(options);
};

const getChurnPrediction = async (options = {}) => {
  return getChurnPredictionService(options);
};

const getSupplyForecast = async (options = {}) => {
  return getSupplyForecastService(options);
};

const getVehicleRecommendation = async (options = {}) => {
  return getVehicleRecommendationService(options);
};

const getRatingPrediction = async (options = {}) => {
  return getRatingPredictionService(options);
};

const getRevenueForecast = async (options = {}) => {
  return getRevenueForecastService(options);
};

const getWeatherEffect = async (options = {}) => {
  return getWeatherEffectPredictionService(options);
};

const getBusinessRecommendation = async (options = {}) => {
  return getBusinessRecommendations(options);
};

const getFraudRiskIntelligence = async (options = {}) => {
  return getFraudRiskIntelligenceService(options);
};

module.exports = {
  getAICoreStatus,
  getDemand,
  getPricing,
  getFareIntelligence,
  getDriverPerformance,
  getDriverPerformanceById,
  getDriverRecommendations,
  getEtaPrediction,
  getCancellationPrediction,
  getChurnPrediction,
  getSupplyForecast,
  getVehicleRecommendation,
  getRatingPrediction,
  getRevenueForecast,
  getWeatherEffect,
  getFraudRiskIntelligence,
  getBusinessRecommendation,
};
