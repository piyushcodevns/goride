const {
  getFareHistory,
} = require("../../ai/services/aiData.service");

const {
  getDemandPrediction,
} = require("../../ai/services/demandPrediction.service");

const {
  buildFareIntelligence,
} = require("../../ai/predictors/fareIntelligence.predictor");

const {
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const {
  BadRequestError,
} = require("../../utils/AppError");

const resolveHistoryRange = ({
  fromDate,
  toDate,
  historyDays,
} = {}) => {
  const end = toDate
    ? new Date(toDate)
    : new Date();

  if (Number.isNaN(end.getTime())) {
    throw new BadRequestError("Invalid toDate.");
  }

  let start;

  if (fromDate) {
    start = new Date(fromDate);
  } else {
    const days = Number.isFinite(Number(historyDays))
      ? Number(historyDays)
      : DEFAULT_HISTORY_DAYS;

    if (
      days < MIN_HISTORY_DAYS ||
      days > MAX_HISTORY_DAYS
    ) {
      throw new BadRequestError(
        `historyDays must be between ${MIN_HISTORY_DAYS} and ${MAX_HISTORY_DAYS}.`,
      );
    }

    start = new Date(
      end.getTime() -
        days * 24 * 60 * 60 * 1000,
    );
  }

  if (Number.isNaN(start.getTime())) {
    throw new BadRequestError("Invalid fromDate.");
  }

  if (start >= end) {
    throw new BadRequestError(
      "fromDate must be earlier than toDate.",
    );
  }

  const days =
    (end.getTime() - start.getTime()) /
    (24 * 60 * 60 * 1000);

  if (
    days < MIN_HISTORY_DAYS ||
    days > MAX_HISTORY_DAYS
  ) {
    throw new BadRequestError(
      `History window must be between ${MIN_HISTORY_DAYS} and ${MAX_HISTORY_DAYS} days.`,
    );
  }

  return {
    fromDate: start,
    toDate: end,
  };
};

const getFareIntelligence = async ({
  fromDate,
  toDate,
  historyDays,
  targetDate,
  targetHour,
} = {}) => {
  const range = resolveHistoryRange({
    fromDate,
    toDate,
    historyDays,
  });

  const rides = await getFareHistory(range);

  let demandPrediction = null;

  if (targetDate && targetHour !== undefined) {
    demandPrediction = await getDemandPrediction({
      historyDays:
        (range.toDate.getTime() -
          range.fromDate.getTime()) /
        (24 * 60 * 60 * 1000),
      targetDate,
      targetHour,
    });
  }

  const result = buildFareIntelligence({
    rides,
    demandPrediction,
  });

  return {
    ...result,
    fromDate: range.fromDate.toISOString(),
    toDate: range.toDate.toISOString(),
  };
};

module.exports = {
  getFareIntelligence,
  resolveHistoryRange,
};
