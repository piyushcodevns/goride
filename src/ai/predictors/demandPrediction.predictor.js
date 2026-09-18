const {
  AI_MODEL_VERSION,
  AI_STATUS,
  MIN_HISTORY_DAYS,
} = require("../utils/aiConstants");

const { mean, weightedMean } = require("../utils/aiMath");

const { buildDemandFeatures } = require("../featureEngineering/demandFeatures");

const MIN_OBSERVATIONS = 24;

const predictDemand = ({ rides, targetDate, targetHour, fromDate, toDate }) => {
  const features = buildDemandFeatures(rides, {
    fromDate,
    toDate,
  });

  if (rides.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INSUFFICIENT_RIDE_HISTORY",
      requiredMinimumObservations: MIN_OBSERVATIONS,
      observations: rides.length,
    };
  }

  const date = new Date(targetDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid target date");
  }

  const hour = Number(targetHour);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("targetHour must be an integer between 0 and 23");
  }

  const hourlyProfile = features.profile.hourly[hour];
  const weekdayProfile = features.profile.weekday[date.getDay()];

  const globalMean = features.profile.statistics.meanDemand;

  const hourlyDemand = hourlyProfile?.averageDemand || globalMean;
  const weekdayDemand = weekdayProfile?.averageDemand || globalMean;

  const predictedDemand = weightedMean(
    [hourlyDemand, weekdayDemand, globalMean],
    [0.5, 0.3, 0.2],
  );

  const historicalSignals = [hourlyDemand, weekdayDemand, globalMean];

  const signalSpread =
    Math.max(...historicalSignals) - Math.min(...historicalSignals);

  const confidence = Math.max(
    0,
    Math.min(1, 1 - signalSpread / Math.max(globalMean, 1)),
  );

  let demandLevel = "LOW";

  if (predictedDemand >= globalMean * 1.5) {
    demandLevel = "HIGH";
  } else if (predictedDemand >= globalMean * 1.15) {
    demandLevel = "MEDIUM";
  }

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    targetDate: date.toISOString(),
    targetHour: hour,
    predictedDemand: Number(predictedDemand.toFixed(2)),
    baselineDemand: Number(globalMean.toFixed(2)),
    demandLevel,
    confidence: Number(confidence.toFixed(4)),
    observations: rides.length,
    minimumHistoryDays: MIN_HISTORY_DAYS,
    features: {
      hourlyAverage: Number(hourlyDemand.toFixed(2)),
      weekdayAverage: Number(weekdayDemand.toFixed(2)),
      globalAverage: Number(globalMean.toFixed(2)),
    },
  };
};

module.exports = {
  predictDemand,
};
