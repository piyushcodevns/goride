const {
  buildSupplyForecast,
} = require("../../ai/predictors/supplyForecast.predictor");

const getSupplyForecast = async () => {
  return buildSupplyForecast({
    driverSnapshots: null,
  });
};

module.exports = {
  getSupplyForecast,
};
