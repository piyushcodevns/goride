const {
  getRatingHistory,
} = require("../../ai/services/aiData.service");

const {
  buildRatingPrediction,
} = require("../../ai/predictors/ratingPrediction.predictor");

const {
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const {
  BadRequestError,
} = require("../../utils/AppError");

const getRatingPrediction = async ({
  vehicleType,
  distance,
  duration,
  historyDays = DEFAULT_HISTORY_DAYS,
} = {}) => {
  const days = Number(historyDays);

  if (
    !Number.isFinite(days) ||
    days < MIN_HISTORY_DAYS ||
    days > MAX_HISTORY_DAYS
  ) {
    throw new BadRequestError(
      `historyDays must be between ${MIN_HISTORY_DAYS} and ${MAX_HISTORY_DAYS}.`,
    );
  }

  const safeDistance = Number(distance);

  if (
    !Number.isFinite(safeDistance) ||
    safeDistance <= 0
  ) {
    throw new BadRequestError(
      "distance must be greater than 0.",
    );
  }

  if (duration !== undefined && duration !== null) {
    const safeDuration = Number(duration);

    if (
      !Number.isFinite(safeDuration) ||
      safeDuration < 0
    ) {
      throw new BadRequestError(
        "duration must be a non-negative number.",
      );
    }
  }

  const toDate = new Date();

  const fromDate = new Date(
    toDate.getTime() -
      days * 24 * 60 * 60 * 1000,
  );

  const ratingHistory =
    await getRatingHistory({
      fromDate,
      toDate,
    });

  const result = buildRatingPrediction({
    ratingHistory,
    vehicleType,
    distance: safeDistance,
    duration,
  });

  return {
    ...result,
    historyDays: days,
    dataWindow: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
  };
};

module.exports = {
  getRatingPrediction,
};
