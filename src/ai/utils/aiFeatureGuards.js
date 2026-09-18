const {
  AI_MODEL_VERSION,
  AI_STATUS,
} = require("./aiConstants");

const BLOCKED_FEATURES = Object.freeze({
  ETA_PREDICTION: "ETA_PREDICTION",
  CANCELLATION_PREDICTION: "CANCELLATION_PREDICTION",
  CHURN_PREDICTION: "CHURN_PREDICTION",
});

const buildBlockedFeatureResponse = ({
  feature,
  reason = "FEATURE_NOT_IMPLEMENTED",
}) => {
  return {
    status: AI_STATUS.BLOCKED,
    modelVersion: AI_MODEL_VERSION,
    feature,
    prediction: null,
    confidence: 0,
    reason,
  };
};

const createBlockedFeatureResponse =
  buildBlockedFeatureResponse;

const assertFeatureAvailable = ({
  enabled,
  feature,
}) => {
  if (!enabled) {
    return buildBlockedFeatureResponse({
      feature,
    });
  }

  return null;
};

module.exports = {
  BLOCKED_FEATURES,
  buildBlockedFeatureResponse,
  createBlockedFeatureResponse,
  assertFeatureAvailable,
};
