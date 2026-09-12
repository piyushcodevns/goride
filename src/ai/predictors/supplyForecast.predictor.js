const {
  AI_MODEL_VERSION,
  AI_STATUS,
} = require("../utils/aiConstants");

const MIN_OBSERVATIONS = 24;

const buildSupplyForecast = ({
  driverSnapshots,
} = {}) => {
  if (!Array.isArray(driverSnapshots)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "SUPPLY_FORECAST",
      prediction: null,
      confidence: 0,
      reason: "NO_HISTORICAL_SUPPLY_SNAPSHOT_SOURCE",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  if (driverSnapshots.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "SUPPLY_FORECAST",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_SUPPLY_HISTORY",
      observations: driverSnapshots.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  return {
    status: AI_STATUS.BLOCKED,
    modelVersion: AI_MODEL_VERSION,
    feature: "SUPPLY_FORECAST",
    prediction: null,
    confidence: 0,
    reason: "SUPPLY_FORECAST_SOURCE_REQUIRES_HISTORICAL_AVAILABILITY_SNAPSHOTS",
    observations: driverSnapshots.length,
  };
};

module.exports = {
  buildSupplyForecast,
};
