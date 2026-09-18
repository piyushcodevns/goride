const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const MIN_RIDE_OBSERVATIONS = 10;
const MIN_PAYMENT_OBSERVATIONS = 10;
const MIN_COUPON_OBSERVATIONS = 5;

const buildFraudRiskPrediction = ({
  rideAnomalyResult = null,
  paymentAnomalyResult = null,
  couponResult = null,
} = {}) => {
  const reasons = [];
  let score = 0;
  let signalCount = 0;

  if (
    rideAnomalyResult?.status === AI_STATUS.READY
  ) {
    signalCount += 1;

    if (rideAnomalyResult.anomalies?.length > 0) {
      score += 35;
      reasons.push("RIDE_ANOMALY_SIGNAL");
    }
  }

  if (
    paymentAnomalyResult?.status === AI_STATUS.READY
  ) {
    signalCount += 1;

    if (paymentAnomalyResult.anomalies?.length > 0) {
      score += 40;
      reasons.push("PAYMENT_ANOMALY_SIGNAL");
    }
  }

  if (
    couponResult?.status === AI_STATUS.READY
  ) {
    signalCount += 1;

    const suspiciousCoupons = Array.isArray(
      couponResult.coupons,
    )
      ? couponResult.coupons.filter(
          (coupon) =>
            coupon.classification === "UNDERPERFORMING",
        )
      : [];

    if (suspiciousCoupons.length > 0) {
      score += 15;
      reasons.push("COUPON_RISK_SIGNAL");
    }
  }

  if (signalCount === 0) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "FRAUD_RISK_INTELLIGENCE",
      prediction: null,
      riskScore: 0,
      riskLevel: "UNKNOWN",
      confidence: 0,
      reason: "NO_VALID_RISK_SIGNALS",
      observations: {
        ride: 0,
        payment: 0,
        coupon: 0,
      },
      requiredMinimumObservations: {
        ride: MIN_RIDE_OBSERVATIONS,
        payment: MIN_PAYMENT_OBSERVATIONS,
        coupon: MIN_COUPON_OBSERVATIONS,
      },
      reasons: [],
      automaticActionAllowed: false,
    };
  }

  const normalizedScore = Number(
    clamp(score, 0, 100).toFixed(2),
  );

  let riskLevel = "LOW";

  if (normalizedScore >= 70) {
    riskLevel = "HIGH";
  } else if (normalizedScore >= 40) {
    riskLevel = "MEDIUM";
  }

  const confidence = Number(
    Math.min(signalCount / 3, 1).toFixed(2),
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    feature: "FRAUD_RISK_INTELLIGENCE",
    prediction: riskLevel,
    riskScore: normalizedScore,
    riskLevel,
    confidence,
    reason:
      reasons.length > 0
        ? "RISK_SIGNALS_DETECTED"
        : "NO_SIGNIFICANT_RISK_SIGNAL",
    observations: {
      ride:
        rideAnomalyResult?.observations ?? 0,
      payment:
        paymentAnomalyResult?.observations ?? 0,
      coupon:
        couponResult?.observations ?? 0,
    },
    reasons,
    automaticActionAllowed: false,
  };
};

module.exports = {
  buildFraudRiskPrediction,
};