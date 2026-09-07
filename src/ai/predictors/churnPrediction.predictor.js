const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  mean,
} = require("../utils/aiMath");

const MIN_USERS = 24;

const FEATURE_WINDOW_DAYS = 28;

const CHURN_WINDOW_DAYS = 28;

const buildChurnPrediction = ({
  users,
  targetDate,
} = {}) => {
  if (!Array.isArray(users)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_CHURN_HISTORY",
      observations: 0,
      requiredMinimumObservations:
        MIN_USERS,
    };
  }

  const cutoff = new Date(targetDate);

  if (Number.isNaN(cutoff.getTime())) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_TARGET_DATE",
      observations: users.length,
    };
  }

  const featureStart = new Date(
    cutoff.getTime() -
      FEATURE_WINDOW_DAYS *
        24 *
        60 *
        60 *
        1000,
  );

  const churnEnd = new Date(
    cutoff.getTime() +
      CHURN_WINDOW_DAYS *
        24 *
        60 *
        60 *
        1000,
  );

  const cohorts = [];

  for (const user of users) {
    const rides = Array.isArray(user.rides)
      ? user.rides
      : [];

    const featureRides = rides.filter(
      (ride) => {
        const createdAt = new Date(
          ride.createdAt,
        );

        return (
          createdAt >= featureStart &&
          createdAt < cutoff
        );
      },
    );

    if (!featureRides.length) {
      continue;
    }

    const futureRides = rides.filter(
      (ride) => {
        const createdAt = new Date(
          ride.createdAt,
        );

        return (
          createdAt >= cutoff &&
          createdAt < churnEnd
        );
      },
    );

    const churned =
      futureRides.length === 0;

    const completedRides =
      featureRides.filter(
        (ride) =>
          ride.status === "COMPLETED",
      );

    const totalDistance = featureRides.reduce(
      (sum, ride) =>
        sum + Number(ride.distance || 0),
      0,
    );

    const totalFare =
      completedRides.reduce(
        (sum, ride) =>
          sum +
          Number(ride.finalFare || 0),
        0,
      );

    const lastRideDate =
      featureRides
        .map(
          (ride) =>
            new Date(ride.createdAt),
        )
        .sort(
          (a, b) => b - a,
        )[0];

    const recencyDays =
      (
        cutoff.getTime() -
        lastRideDate.getTime()
      ) /
      (24 * 60 * 60 * 1000);

    cohorts.push({
      userId: user.id,
      rideCount: featureRides.length,
      completedRideCount:
        completedRides.length,
      totalDistance,
      totalFare,
      recencyDays,
      churned,
    });
  }

  if (cohorts.length < MIN_USERS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "CHURN_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_CHURN_COHORT",
      observations: cohorts.length,
      requiredMinimumObservations:
        MIN_USERS,
      featureWindowDays:
        FEATURE_WINDOW_DAYS,
      churnWindowDays:
        CHURN_WINDOW_DAYS,
    };
  }

  const churnLabels = cohorts.map(
    (item) =>
      item.churned ? 1 : 0,
  );

  const historicalChurnRate =
    mean(churnLabels);

  const averageRecency = mean(
    cohorts.map(
      (item) => item.recencyDays,
    ),
  );

  const prediction =
    clamp(
      historicalChurnRate *
        (averageRecency > 14 ? 1.2 : 1),
      0,
      1,
    );

  let riskLevel = "LOW";

  if (prediction >= 0.5) {
    riskLevel = "HIGH";
  } else if (prediction >= 0.25) {
    riskLevel = "MEDIUM";
  }

  const confidence = Number(
    clamp(
      cohorts.length / 100,
      0,
      1,
    ).toFixed(4),
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    feature: "CHURN_PREDICTION",

    target:
      "NO_RIDE_DURING_FUTURE_CHURN_WINDOW",

    prediction: Number(
      prediction.toFixed(4),
    ),

    probabilityType:
      "HISTORICAL_COHORT_RATE",

    riskLevel,

    features: [
      "rideCount",
      "completedRideCount",
      "totalDistance",
      "totalFare",
      "recencyDays",
    ],

    statistics: {
      historicalChurnRate:
        Number(
          historicalChurnRate.toFixed(4),
        ),
      averageRecencyDays:
        Number(
          averageRecency.toFixed(2),
        ),
    },

    observations: cohorts.length,
    requiredMinimumObservations:
      MIN_USERS,

    featureWindowDays:
      FEATURE_WINDOW_DAYS,

    churnWindowDays:
      CHURN_WINDOW_DAYS,

    predictionTimestamp:
      cutoff.toISOString(),

    confidence,
    confidenceType: "HEURISTIC",

    predictionType:
      "HISTORICAL_COHORT_BASELINE",

    futureOutcomeUsedForPrediction: false,
    futureOutcomeUsedOnlyForHistoricalLabeling:
      true,
  };
};

module.exports = {
  buildChurnPrediction,
};
