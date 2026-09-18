const MIN_OBSERVATIONS = 24;
const MODEL_VERSION = "goride-ai-v1";

const buildWeatherEffectPrediction = ({
  weatherHistory,
} = {}) => {
  if (!Array.isArray(weatherHistory)) {
    return {
      status: "BLOCKED",
      modelVersion: MODEL_VERSION,
      feature: "WEATHER_EFFECT",
      prediction: null,
      confidence: 0,
      reason: "NO_HISTORICAL_WEATHER_SOURCE",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
      target: "WEATHER_EFFECT_ON_RIDE_BEHAVIOR",
      features: [
        "weather_condition",
        "temperature",
        "precipitation",
        "ride_demand",
        "ride_cancellation",
      ],
      pricingAdjustmentAllowed: false,
    };
  }

  if (weatherHistory.length < MIN_OBSERVATIONS) {
    return {
      status: "INSUFFICIENT_DATA",
      modelVersion: MODEL_VERSION,
      feature: "WEATHER_EFFECT",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_WEATHER_HISTORY",
      observations: weatherHistory.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
      pricingAdjustmentAllowed: false,
    };
  }

  return {
    status: "BLOCKED",
    modelVersion: MODEL_VERSION,
    feature: "WEATHER_EFFECT",
    prediction: null,
    confidence: 0,
    reason: "WEATHER_EFFECT_MODEL_NOT_AVAILABLE",
    observations: weatherHistory.length,
    requiredMinimumObservations: MIN_OBSERVATIONS,
    pricingAdjustmentAllowed: false,
  };
};

module.exports = {
  buildWeatherEffectPrediction,
};