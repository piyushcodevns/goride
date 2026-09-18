const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  mean,
  standardDeviation,
} = require("../utils/aiMath");

const MIN_OBSERVATIONS = 24;

const buildRatingPrediction = ({
  ratingHistory,
  vehicleType,
  distance,
  duration,
} = {}) => {
  if (!Array.isArray(ratingHistory)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "RATING_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_RATING_HISTORY",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const safeDistance = Number(distance);
  const safeDuration =
    duration === undefined || duration === null
      ? null
      : Number(duration);

  if (
    !Number.isFinite(safeDistance) ||
    safeDistance <= 0
  ) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "RATING_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DISTANCE",
      observations: ratingHistory.length,
    };
  }

  if (
    safeDuration !== null &&
    (!Number.isFinite(safeDuration) ||
      safeDuration < 0)
  ) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "RATING_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DURATION",
      observations: ratingHistory.length,
    };
  }

  const validHistory = ratingHistory.filter(
    (item) => {
      const rating = Number(item.rating);
      const rideDistance = Number(
        item.ride?.distance,
      );

      return (
        Number.isFinite(rating) &&
        rating >= 1 &&
        rating <= 5 &&
        Number.isFinite(rideDistance) &&
        rideDistance > 0 &&
        item.ride?.vehicleType
      );
    },
  );

  if (validHistory.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "RATING_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_RATING_HISTORY",
      observations: validHistory.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const allRatings = validHistory.map(
    (item) => Number(item.rating),
  );

  const globalAverage = mean(allRatings);

  const vehicleRatings = validHistory
    .filter(
      (item) =>
        !vehicleType ||
        item.ride.vehicleType === vehicleType,
    )
    .map((item) => Number(item.rating));

  const distanceWindow = Math.max(
    2,
    safeDistance * 0.25,
  );

  const distanceRatings = validHistory
    .filter((item) => {
      const rideDistance = Number(
        item.ride.distance,
      );

      return (
        Math.abs(
          rideDistance - safeDistance,
        ) <= distanceWindow
      );
    })
    .map((item) => Number(item.rating));

  const signals = [
    {
      value:
        vehicleRatings.length > 0
          ? mean(vehicleRatings)
          : globalAverage,
      weight:
        vehicleRatings.length > 0
          ? 0.35
          : 0,
    },
    {
      value:
        distanceRatings.length > 0
          ? mean(distanceRatings)
          : globalAverage,
      weight:
        distanceRatings.length > 0
          ? 0.35
          : 0,
    },
    {
      value: globalAverage,
      weight: 0.3,
    },
  ];

  const totalWeight = signals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );

  const predictedRating =
    totalWeight > 0
      ? signals.reduce(
          (sum, signal) =>
            sum +
            signal.value * signal.weight,
          0,
        ) / totalWeight
      : globalAverage;

  const ratingStdDev =
    standardDeviation(allRatings);

  const stabilityConfidence = clamp(
    1 -
      ratingStdDev /
        Math.max(globalAverage, 1),
    0,
    1,
  );

  const sampleConfidence = clamp(
    validHistory.length / 100,
    0,
    1,
  );

  const confidence = Number(
    (
      stabilityConfidence * 0.6 +
      sampleConfidence * 0.4
    ).toFixed(4),
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    feature: "RATING_PREDICTION",

    target: "RIDE_REVIEW_RATING",

    features: [
      "vehicleType",
      "distance",
      "duration",
      "isScheduled",
      "scheduledFor",
    ],

    prediction: Number(
      clamp(predictedRating, 1, 5).toFixed(2),
    ),

    ratingScale: {
      minimum: 1,
      maximum: 5,
    },

    statistics: {
      globalAverageRating: Number(
        globalAverage.toFixed(2),
      ),
      ratingStdDev: Number(
        ratingStdDev.toFixed(2),
      ),
      vehicleObservations:
        vehicleRatings.length,
      distanceSimilarObservations:
        distanceRatings.length,
    },

    observations: validHistory.length,
    requiredMinimumObservations:
      MIN_OBSERVATIONS,

    confidence,
    confidenceType: "HEURISTIC",

    predictionType:
      "HISTORICAL_RATING_BASELINE",

    futureOutcomeUsedForPrediction: false,
  };
};

module.exports = {
  buildRatingPrediction,
};