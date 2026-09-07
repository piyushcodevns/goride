const fraudRiskPredictor = require("../../ai/predictors/fraudRisk.predictor");

const anomalyDetectionPredictor = require("../../ai/predictors/anomalyDetection.predictor");

const couponIntelligencePredictor = require("../../ai/predictors/couponIntelligence.predictor");

const aiData = require("../../ai/services/aiData.service");

const getFraudRiskIntelligence = async ({ fromDate, toDate } = {}) => {
  const now = new Date();

  const resolvedToDate = toDate ? new Date(toDate) : now;

  const resolvedFromDate = fromDate
    ? new Date(fromDate)
    : new Date(resolvedToDate.getTime() - 28 * 24 * 60 * 60 * 1000);

  const [rides, payments, couponUsages] = await Promise.all([
    aiData.getRideHistory({
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
    }),
    aiData.getPaymentHistory({
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
    }),
    aiData.getCouponUsageHistory({
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
    }),
  ]);

  const rideAnomalyResult =
    anomalyDetectionPredictor.detectRideAnomalies(rides);

  const paymentAnomalyResult =
    anomalyDetectionPredictor.detectPaymentAnomalies(payments);

  const couponResult = couponIntelligencePredictor.analyzeCouponUsage({
    usages: couponUsages,
    coupons: [],
  });

  return fraudRiskPredictor.buildFraudRiskPrediction({
    rideAnomalyResult,
    paymentAnomalyResult,
    couponResult,
  });
};

module.exports = {
  getFraudRiskIntelligence,
};
