const aiDataService = require("../../ai/services/aiData.service");
const churnPredictionPredictor = require("../../ai/predictors/churnPrediction.predictor");

const CHURN_WINDOW_DAYS = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

const getChurnPrediction = async ({ fromDate, toDate, targetDate } = {}) => {
  const endDate = toDate ? new Date(toDate) : new Date();

  const predictionDate = targetDate ? new Date(targetDate) : endDate;

  if (
    Number.isNaN(endDate.getTime()) ||
    Number.isNaN(predictionDate.getTime())
  ) {
    return {
      status: "INSUFFICIENT_DATA",
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DATE_RANGE",
      observations: 0,
    };
  }

  const churnEnd = new Date(
    predictionDate.getTime() + CHURN_WINDOW_DAYS * DAY_MS,
  );

  /*
   * Churn prediction requires a completed future
   * outcome window when used as a historical cohort
   * baseline.
   *
   * If the outcome window extends beyond available
   * history, future outcomes do not exist yet.
   * Never treat missing future data as churn.
   */
  if (churnEnd > endDate) {
    return {
      status: "BLOCKED",
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "FUTURE_CHURN_OUTCOME_NOT_AVAILABLE",
      observations: 0,
      featureWindowDays: 28,
      churnWindowDays: CHURN_WINDOW_DAYS,
      futureOutcomeUsedForPrediction: false,
      futureOutcomeUsedOnlyForHistoricalLabeling: true,
    };
  }

  const startDate = fromDate
    ? new Date(fromDate)
    : new Date(predictionDate.getTime() - 28 * DAY_MS);

  if (Number.isNaN(startDate.getTime())) {
    return {
      status: "INSUFFICIENT_DATA",
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DATE_RANGE",
      observations: 0,
    };
  }

  const history = await aiDataService.getChurnHistory({
    fromDate: startDate,
    toDate: endDate,
  });

  return churnPredictionPredictor.buildChurnPrediction({
    users: history,
    targetDate: predictionDate,
  });
};

module.exports = {
  getChurnPrediction,
};
