const {
  DEFAULT_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  AI_STATUS,
  AI_MODEL_VERSION,
} = require("../utils/aiConstants");

const { predictDemand } = require("../predictors/demandPrediction.predictor");

const { evaluateDemandPredictions } = require("./aiEvaluation.service");

const {
  createDemandModelMetadata,
} = require("../models/demandPrediction.model");

const { getRideHistory } = require("./aiData.service");

const getDateRange = (historyDays = DEFAULT_HISTORY_DAYS) => {
  const safeDays = Math.min(
    Math.max(Number(historyDays) || DEFAULT_HISTORY_DAYS, MIN_HISTORY_DAYS),
    MAX_HISTORY_DAYS,
  );

  const toDate = new Date();
  const fromDate = new Date(toDate);

  fromDate.setDate(fromDate.getDate() - safeDays);

  return {
    fromDate,
    toDate,
    historyDays: safeDays,
  };
};

const getDemandPrediction = async ({ historyDays, targetDate, targetHour }) => {
  const {
    fromDate,
    toDate,
    historyDays: normalizedHistoryDays,
  } = getDateRange(historyDays);

  const rides = await getRideHistory({
    fromDate,
    toDate,
  });

  const prediction = predictDemand({
    rides,
    targetDate,
    targetHour,
    fromDate,
    toDate,
  });

  if (prediction.status !== AI_STATUS.READY) {
    return {
      ...prediction,
      historyDays: normalizedHistoryDays,
      modelVersion: AI_MODEL_VERSION,
    };
  }

  return {
    ...prediction,
    historyDays: normalizedHistoryDays,
    dataWindow: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
  };
};

const evaluateDemandModel = async ({ historyDays }) => {
  const {
    fromDate,
    toDate,
    historyDays: normalizedHistoryDays,
  } = getDateRange(historyDays);

  const rides = await getRideHistory({
    fromDate,
    toDate,
  });

  if (rides.length < 48) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      historyDays: normalizedHistoryDays,
      observations: rides.length,
      requiredMinimumObservations: 48,
      reason: "INSUFFICIENT_EVALUATION_DATA",
    };
  }

  const sortedRides = [...rides].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  const splitIndex = Math.floor(sortedRides.length * 0.8);

  const trainingRides = sortedRides.slice(0, splitIndex);
  const evaluationRides = sortedRides.slice(splitIndex);

  const evaluationByHour = new Map();

  for (const ride of evaluationRides) {
    const date = new Date(ride.createdAt);

    const key = [
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
    ].join("-");

    if (!evaluationByHour.has(key)) {
      evaluationByHour.set(key, {
        date,
        actual: 0,
      });
    }

    evaluationByHour.get(key).actual += 1;
  }

  const actual = [];
  const predicted = [];

  for (const bucket of evaluationByHour.values()) {
    const result = predictDemand({
      rides: trainingRides,
      targetDate: bucket.date,
      targetHour: bucket.date.getHours(),
      fromDate,
      toDate: bucket.date,
    });

    if (result.status !== AI_STATUS.READY) {
      continue;
    }

    actual.push(bucket.actual);
    predicted.push(result.predictedDemand);
  }

  const metrics = evaluateDemandPredictions({
    actual,
    predicted,
  });

  const metadata = createDemandModelMetadata({
    trainingObservations: trainingRides.length,
    evaluationObservations: evaluationRides.length,
    metrics,
  });

  return {
    status: metrics.status,
    modelVersion: AI_MODEL_VERSION,
    historyDays: normalizedHistoryDays,
    metrics,
    model: metadata,
  };
};

module.exports = {
  getDemandPrediction,
  evaluateDemandModel,
};
