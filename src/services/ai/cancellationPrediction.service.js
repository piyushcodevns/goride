const {
  getCancellationHistory,
} = require("../../ai/services/aiData.service");

const {
  buildCancellationPrediction,
} = require("../../ai/predictors/cancellationPrediction.predictor");

const {
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const {
  BadRequestError,
} = require("../../utils/AppError");

const getCancellationPrediction = async ({
  vehicleType,
  distance,
  isScheduled = false,
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

  if (typeof isScheduled !== "boolean") {
    throw new BadRequestError(
      "isScheduled must be a boolean.",
    );
  }

  const toDate = new Date();

  const fromDate = new Date(
    toDate.getTime() -
      days * 24 * 60 * 60 * 1000,
  );

  const rideHistory =
    await getCancellationHistory({
      fromDate,
      toDate,
    });

  const result = buildCancellationPrediction({
    rideHistory,
    vehicleType,
    distance: safeDistance,
    isScheduled,
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
  getCancellationPrediction,
};
