const {
  AI_MODEL_VERSION,
} = require("../utils/aiConstants");

const createDemandModelMetadata = ({
  trainingObservations,
  evaluationObservations,
  metrics,
}) => ({
  modelName: "GoRide Demand Forecast",
  modelVersion: AI_MODEL_VERSION,
  modelType: "STATISTICAL_BASELINE",
  algorithm: "Weighted Historical Demand",
  trainingObservations,
  evaluationObservations,
  metrics: {
    mae:
      metrics?.mae === null || metrics?.mae === undefined
        ? null
        : Number(metrics.mae.toFixed(4)),
    mape:
      metrics?.mape === null || metrics?.mape === undefined
        ? null
        : Number(metrics.mape.toFixed(4)),
  },
  deterministic: true,
  usesRealHistoricalData: true,
  generatedAt: new Date().toISOString(),
});

module.exports = {
  createDemandModelMetadata,
};
