const businessRecommendationPredictor = require("../../ai/predictors/businessRecommendation.predictor");

const getBusinessRecommendations = async ({
  demand = null,
  supply = null,
  fare = null,
  vehicle = null,
  cancellation = null,
  revenue = null,
  fraudRisk = null,
} = {}) => {
  return businessRecommendationPredictor.buildBusinessRecommendations({
    demand,
    supply,
    fare,
    vehicle,
    cancellation,
    revenue,
    fraudRisk,
  });
};

module.exports = {
  getBusinessRecommendations,
};
