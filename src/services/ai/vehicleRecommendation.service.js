const {
  getVehicleRecommendationHistory,
} = require("../../ai/services/aiData.service");

const {
  buildVehicleRecommendation,
} = require("../../ai/predictors/vehicleRecommendation.predictor");

const {
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const { BadRequestError } = require("../../utils/AppError");

const getVehicleRecommendation = async ({
  requestedDistance,
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

  const distance = Number(requestedDistance);

  if (!Number.isFinite(distance) || distance <= 0) {
    throw new BadRequestError("requestedDistance must be greater than 0.");
  }

  const toDate = new Date();

  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

  const rides = await getVehicleRecommendationHistory({
    fromDate,
    toDate,
  });

  const result = buildVehicleRecommendation({
    rides,
    requestedDistance: distance,
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
  getVehicleRecommendation,
};
