const aiDataService = require("../../ai/services/aiData.service");
const revenueForecastPredictor = require("../../ai/predictors/revenueForecast.predictor");

const getRevenueForecast = async ({
  fromDate,
  toDate,
  forecastDays = 7,
} = {}) => {
  const endDate = toDate
    ? new Date(toDate)
    : new Date();

  const startDate = fromDate
    ? new Date(fromDate)
    : new Date(
        endDate.getTime() -
          56 * 24 * 60 * 60 * 1000
      );

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return {
      status: "INSUFFICIENT_DATA",
      modelVersion: "goride-ai-v1",
      feature: "REVENUE_FORECAST",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DATE_RANGE",
      observations: 0,
    };
  }

  const payments =
    await aiDataService.getRevenueHistory({
      fromDate: startDate,
      toDate: endDate,
    });

  return revenueForecastPredictor.buildRevenueForecast({
    payments,
    forecastDays,
  });
};

module.exports = {
  getRevenueForecast,
};