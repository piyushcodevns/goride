const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const buildPricingSignal = ({
  demandPrediction,
}) => {
  if (!demandPrediction) {
    throw new Error("demandPrediction is required");
  }

  if (
    demandPrediction.status !== AI_STATUS.READY
  ) {
    return {
      status: demandPrediction.status,
      modelVersion: AI_MODEL_VERSION,
      reason:
        demandPrediction.reason ||
        "DEMAND_SIGNAL_UNAVAILABLE",
    };
  }

  const predictedDemand = Number(
    demandPrediction.predictedDemand,
  );

  const baselineDemand = Number(
    demandPrediction.baselineDemand,
  );

  if (
    !Number.isFinite(predictedDemand) ||
    !Number.isFinite(baselineDemand) ||
    baselineDemand <= 0
  ) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INVALID_DEMAND_SIGNAL",
    };
  }

  const demandRatio =
    predictedDemand / baselineDemand;

  let pricingSignal = "NORMAL";

  if (demandRatio >= 1.5) {
    pricingSignal = "HIGH";
  } else if (demandRatio >= 1.15) {
    pricingSignal = "MEDIUM";
  } else if (demandRatio < 0.85) {
    pricingSignal = "LOW";
  }

  const confidence = clamp(
    Number(demandPrediction.confidence || 0),
    0,
    1,
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    pricingSignal,
    demandLevel:
      demandPrediction.demandLevel,
    demandRatio: Number(
      demandRatio.toFixed(4),
    ),
    confidence: Number(
      confidence.toFixed(4),
    ),
    predictedDemand,
    baselineDemand,
    pricingAdjustmentAllowed: false,
  };
};

module.exports = {
  buildPricingSignal,
};
