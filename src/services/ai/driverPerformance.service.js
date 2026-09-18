const {
  getDriverHistory,
} = require("../../ai/services/aiData.service");

const {
  calculateDriverPerformanceScore,
} = require("../../ai/scoring/driverPerformance.score");

const {
  AI_MODEL_VERSION,
  AI_STATUS,
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const {
  NotFoundError,
  BadRequestError,
} = require("../../utils/AppError");

const resolveHistoryRange = ({
  fromDate,
  toDate,
} = {}) => {
  const end = toDate
    ? new Date(toDate)
    : new Date();

  if (Number.isNaN(end.getTime())) {
    throw new BadRequestError("Invalid toDate.");
  }

  const start = fromDate
    ? new Date(fromDate)
    : new Date(
        end.getTime() -
          DEFAULT_HISTORY_DAYS * 24 * 60 * 60 * 1000,
      );

  if (Number.isNaN(start.getTime())) {
    throw new BadRequestError("Invalid fromDate.");
  }

  if (start >= end) {
    throw new BadRequestError(
      "fromDate must be earlier than toDate.",
    );
  }

  const historyDays =
    (end.getTime() - start.getTime()) /
    (24 * 60 * 60 * 1000);

  if (
    historyDays < MIN_HISTORY_DAYS ||
    historyDays > MAX_HISTORY_DAYS
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

const getDriverPerformance = async ({
  driverId,
  fromDate,
  toDate,
} = {}) => {
  const range = resolveHistoryRange({
    fromDate,
    toDate,
  });

  const drivers = await getDriverHistory(range);

  let selectedDrivers = drivers;

  if (driverId) {
    selectedDrivers = drivers.filter(
      (driver) => driver.id === driverId,
    );

    if (!selectedDrivers.length) {
      throw new NotFoundError(
        "Driver not found.",
      );
    }
  }

  const scores = selectedDrivers.map(
    calculateDriverPerformanceScore,
  );

  const readyCount = scores.filter(
    (item) => item.status === AI_STATUS.READY,
  ).length;

  return {
    status:
      readyCount > 0
        ? AI_STATUS.READY
        : AI_STATUS.INSUFFICIENT_DATA,

    modelVersion: AI_MODEL_VERSION,

    fromDate: range.fromDate.toISOString(),
    toDate: range.toDate.toISOString(),

    totalDrivers: scores.length,
    readyDrivers: readyCount,

    drivers: scores,
  };
};

const getDriverPerformanceById = async (
  driverId,
  options = {},
) => {
  const result = await getDriverPerformance({
    ...options,
    driverId,
  });

  return result.drivers[0];
};

module.exports = {
  getDriverPerformance,
  getDriverPerformanceById,
  resolveHistoryRange,
};
