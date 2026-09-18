const weatherEffectPredictor = require("../../ai/predictors/weatherEffect.predictor");

const getWeatherEffectPrediction = async () => {
  return weatherEffectPredictor.buildWeatherEffectPrediction({
    weatherHistory: null,
  });
};

module.exports = {
  getWeatherEffectPrediction,
};
