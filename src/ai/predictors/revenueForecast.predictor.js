const MIN_OBSERVATIONS = 24;
const MODEL_VERSION = "goride-ai-v1";

const isValidRevenueRecord = (record) => {
  const amount = Number(record?.amount);

  return Number.isFinite(amount) && amount >= 0 && record?.createdAt;
};

const buildDailyRevenue = (records) => {
  const buckets = new Map();

  for (const record of records) {
    if (!isValidRevenueRecord(record)) {
      continue;
    }

    const date = new Date(record.createdAt);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = date.toISOString().slice(0, 10);
    const amount = Number(record.amount);

    buckets.set(key, (buckets.get(key) || 0) + amount);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({
      date,
      revenue,
    }));
};

const buildRevenueForecast = ({ payments, forecastDays = 7 } = {}) => {
  if (!Array.isArray(payments)) {
    return {
      status: "INSUFFICIENT_DATA",
      modelVersion: MODEL_VERSION,
      feature: "REVENUE_FORECAST",
      prediction: null,
      confidence: 0,
      reason: "INVALID_REVENUE_HISTORY",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const dailyRevenue = buildDailyRevenue(payments);

  if (dailyRevenue.length < MIN_OBSERVATIONS) {
    return {
      status: "INSUFFICIENT_DATA",
      modelVersion: MODEL_VERSION,
      feature: "REVENUE_FORECAST",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_REVENUE_HISTORY",
      observations: dailyRevenue.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const values = dailyRevenue.map((entry) => entry.revenue);

  const recentWindow = values.slice(-7);

  const recentAverage =
    recentWindow.reduce((sum, value) => sum + value, 0) / recentWindow.length;

  const historicalAverage =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const forecastDailyRevenue = recentAverage * 0.7 + historicalAverage * 0.3;

  const days = Math.max(1, Math.min(Number(forecastDays) || 7, 30));

  const forecastRevenue = forecastDailyRevenue * days;

  return {
    status: "READY",
    modelVersion: MODEL_VERSION,
    feature: "REVENUE_FORECAST",

    prediction: {
      forecastDays: days,
      dailyRevenue: Number(forecastDailyRevenue.toFixed(2)),
      totalRevenue: Number(forecastRevenue.toFixed(2)),
      historicalAverageDailyRevenue: Number(historicalAverage.toFixed(2)),
      recentAverageDailyRevenue: Number(recentAverage.toFixed(2)),
    },

    target: "DAILY_SUCCESSFUL_PAYMENT_REVENUE",

    features: ["historical_daily_revenue", "recent_7_day_revenue"],

    observations: dailyRevenue.length,

    confidence: Math.min(0.95, 0.5 + dailyRevenue.length / 100),

    confidenceType: "HEURISTIC",

    predictionType: "WEIGHTED_HISTORICAL_BASELINE",

    fallback: "INSUFFICIENT_DATA_IF_HISTORY_IS_BELOW_MINIMUM",

    pricingAdjustmentAllowed: false,

    predictionTimestamp: new Date().toISOString(),
  };
};

module.exports = {
  buildRevenueForecast,
};
