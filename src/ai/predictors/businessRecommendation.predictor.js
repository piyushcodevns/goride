const { AI_MODEL_VERSION } = require("../utils/aiConstants");

const buildBusinessRecommendations = ({
  demand = null,
  supply = null,
  fare = null,
  vehicle = null,
  cancellation = null,
  revenue = null,
  fraudRisk = null,
} = {}) => {
  const recommendations = [];

  if (demand?.status === "READY") {
    if (Number(demand?.predictedDemand ?? 0) > 0) {
      recommendations.push({
        type: "DEMAND",
        priority: "HIGH",
        recommendation:
          "Monitor driver availability against forecasted demand.",
        reason: "DEMAND_FORECAST_AVAILABLE",
      });
    }
  }

  if (supply?.status === "READY") {
    recommendations.push({
      type: "SUPPLY",
      priority: "MEDIUM",
      recommendation: "Review driver supply against expected ride demand.",
      reason: "SUPPLY_FORECAST_AVAILABLE",
    });
  }

  if (fare?.status === "READY") {
    recommendations.push({
      type: "FARE",
      priority: "MEDIUM",
      recommendation:
        "Review fare intelligence before making pricing decisions.",
      reason: "FARE_INTELLIGENCE_AVAILABLE",
    });
  }

  if (vehicle?.status === "READY") {
    recommendations.push({
      type: "VEHICLE",
      priority: "LOW",
      recommendation:
        "Review vehicle-type suitability for observed ride patterns.",
      reason: "VEHICLE_INTELLIGENCE_AVAILABLE",
    });
  }

  if (cancellation?.status === "READY") {
    recommendations.push({
      type: "CANCELLATION",
      priority: "HIGH",
      recommendation:
        "Investigate cancellation patterns and operational causes.",
      reason: "CANCELLATION_SIGNAL_AVAILABLE",
    });
  }

  if (revenue?.status === "READY") {
    recommendations.push({
      type: "REVENUE",
      priority: "MEDIUM",
      recommendation:
        "Monitor forecasted revenue against recent payment trends.",
      reason: "REVENUE_FORECAST_AVAILABLE",
    });
  }

  if (fraudRisk?.status === "READY") {
    if (fraudRisk.riskLevel === "HIGH" || fraudRisk.riskLevel === "MEDIUM") {
      recommendations.push({
        type: "RISK",
        priority: "HIGH",
        recommendation:
          "Review elevated risk signals through authorized admin workflows.",
        reason: "ELEVATED_RISK_SIGNAL",
      });
    }
  }

  return {
    status: "READY",
    modelVersion: AI_MODEL_VERSION,
    feature: "BUSINESS_RECOMMENDATION_INTELLIGENCE",
    recommendations,
    recommendationCount: recommendations.length,
    automaticActionAllowed: false,
  };
};

module.exports = {
  buildBusinessRecommendations,
};
