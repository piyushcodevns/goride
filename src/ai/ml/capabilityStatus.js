const { MODEL_TYPES } = require("./contracts");
const { getModel, MODEL_NOT_AVAILABLE } = require("./modelRegistry");

const FALLBACKS = Object.freeze({
  fare: MODEL_TYPES.STATISTICAL_BASELINE,
  demand: MODEL_TYPES.STATISTICAL_BASELINE,
  cancellation: MODEL_TYPES.STATISTICAL_BASELINE,
  vehicle: MODEL_TYPES.HEURISTIC,
  rating: MODEL_TYPES.STATISTICAL_BASELINE,
  revenue: MODEL_TYPES.STATISTICAL_BASELINE,
  eta: MODEL_TYPES.DATA_BLOCKED,
  weather: MODEL_TYPES.DATA_BLOCKED,
  fraud: MODEL_TYPES.HEURISTIC,
  churn: MODEL_TYPES.DATA_BLOCKED,
  driver: MODEL_TYPES.HEURISTIC,
});

const getCapabilityStatus = (feature) => {
  const model = getModel(feature);
  if (model.status !== MODEL_NOT_AVAILABLE) {
    return { status: "ML_MODEL", modelType: MODEL_TYPES.ML, modelVersion: model.metadata.modelVersion };
  }

  const fallback = FALLBACKS[feature];
  if (!fallback) return { status: "INSUFFICIENT_DATA", modelType: MODEL_TYPES.INSUFFICIENT_DATA };
  return {
    status: fallback === MODEL_TYPES.DATA_BLOCKED ? "DATA_BLOCKED" : fallback,
    modelType: fallback,
    modelVersion: "goride-ai-v1",
    reason: fallback === MODEL_TYPES.DATA_BLOCKED ? "REQUIRED_HISTORICAL_SOURCE_UNAVAILABLE" : "NO_VALIDATED_ML_ARTIFACT",
  };
};

const getAllCapabilityStatuses = () => Object.fromEntries(
  Object.keys(FALLBACKS).map((feature) => [feature, getCapabilityStatus(feature)]),
);

module.exports = { FALLBACKS, getCapabilityStatus, getAllCapabilityStatuses };
