const {
  getDemandPrediction,
} = require("../../ai/services/demandPrediction.service");

const {
  buildPricingSignal,
} = require("../../ai/predictors/pricingSignal.predictor");

const getPricingSignal = async ({
  historyDays,
  targetDate,
  targetHour,
} = {}) => {
  const demandPrediction =
    await getDemandPrediction({
      historyDays,
      targetDate,
      targetHour,
    });

  return buildPricingSignal({
    demandPrediction,
  });
};

module.exports = {
  getPricingSignal,
};
