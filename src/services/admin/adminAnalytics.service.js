const analyticsRepository = require("../../repositories/admin/adminAnalytics.repository");

const CacheService = require("../cache.service");

const {
  createAuditLog,
} = require("../../repositories/admin/adminAuth.repository");

const round = (value, decimals = 2) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return 0;
  }

  const factor = 10 ** decimals;

  return Math.round(Number(value) * factor) / factor;
};

const calculateChange = (current, previous) => {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  const absoluteChange = currentValue - previousValue;

  let percentageChange = null;

  if (previousValue !== 0) {
    percentageChange = round((absoluteChange / Math.abs(previousValue)) * 100);
  }

  let trend = "FLAT";

  if (absoluteChange > 0) {
    trend = "UP";
  } else if (absoluteChange < 0) {
    trend = "DOWN";
  }

  return {
    current: currentValue,
    previous: previousValue,
    absoluteChange,
    percentageChange,
    trend,
  };
};

const DEFAULT_ANALYTICS_DAYS = 30;
const MAX_ANALYTICS_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const validateRange = ({ fromDate, toDate }) => {
  const now = new Date();

  const to = toDate ? new Date(toDate) : now;

  if (Number.isNaN(to.getTime())) {
    throw new Error("Invalid analytics toDate");
  }

  const from = fromDate
    ? new Date(fromDate)
    : new Date(to.getTime() - DEFAULT_ANALYTICS_DAYS * DAY_MS);

  if (Number.isNaN(from.getTime())) {
    throw new Error("Invalid analytics fromDate");
  }

  if (from >= to) {
    throw new Error("Analytics fromDate must be before toDate");
  }

  const rangeDays = (to.getTime() - from.getTime()) / DAY_MS;

  if (rangeDays > MAX_ANALYTICS_RANGE_DAYS) {
    throw new Error(
      `Analytics date range cannot exceed ${MAX_ANALYTICS_RANGE_DAYS} days`,
    );
  }

  return {
    from,
    to,
  };
};

const ANALYTICS_CACHE_TTL_MS = Number(
  process.env.ANALYTICS_CACHE_TTL_MS || 5 * 60 * 1000,
);

const createAnalyticsCacheKey = (type, filters = {}) => {
  const normalized = {
    fromDate: filters.fromDate
      ? new Date(filters.fromDate).toISOString()
      : null,
    toDate: filters.toDate ? new Date(filters.toDate).toISOString() : null,
    granularity: filters.granularity || null,
    type: filters.type || null,
    limit: filters.limit || null,
  };

  return `admin:analytics:${type}:${JSON.stringify(normalized)}`;
};

const withAnalyticsCache = async (type, filters, adminContext, resolver) => {
  const cacheKey = createAnalyticsCacheKey(type, filters);

  const cached = CacheService.get(cacheKey);

  if (cached !== null) {
    await createAnalyticsAuditLog({
      type,
      filters,
      adminContext,
      cacheHit: true,
    });

    return cached;
  }

  const result = await resolver();

  CacheService.set(cacheKey, result, ANALYTICS_CACHE_TTL_MS);

  await createAnalyticsAuditLog({
    type,
    filters,
    adminContext,
    cacheHit: false,
  });

  return result;
};

const createAnalyticsAuditLog = async ({
  type,
  filters = {},
  adminContext = {},
  cacheHit = false,
}) => {
  if (!adminContext.adminId) {
    return;
  }

  await createAuditLog({
    adminId: adminContext.adminId,
    action: "VIEW_ANALYTICS",
    entity: "ANALYTICS",
    entityId: type,
    metadata: {
      analyticsType: type,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      granularity: filters.granularity || null,
      cacheHit,
    },
    ipAddress: adminContext.ipAddress || null,
    userAgent: adminContext.userAgent || null,
  });
};

const validateGranularity = (granularity) => {
  const allowed = ["daily", "weekly", "monthly"];

  if (!allowed.includes(granularity)) {
    throw new Error("Analytics granularity must be daily, weekly, or monthly");
  }

  return granularity;
};

const getBucketKey = (dateValue, granularity) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (granularity === "monthly") {
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  }

  if (granularity === "weekly") {
    const bucket = new Date(Date.UTC(year, month, day));
    const dayOfWeek = bucket.getUTCDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;

    bucket.setUTCDate(bucket.getUTCDate() - daysFromMonday);

    return bucket.toISOString().slice(0, 10);
  }

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

const aggregateCountGrowth = (
  records,
  dateField,
  granularity,
  metricName = "registrations",
) => {
  const buckets = new Map();

  for (const record of records || []) {
    const key = getBucketKey(record[dateField], granularity);

    if (!key) {
      continue;
    }

    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({
      period,
      [metricName]: count,
    }));
};

/**
 * MODULE 13.1
 * Overall growth comparison.
 */
const getGrowth = async ({ fromDate, toDate }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  const data = await analyticsRepository.getGrowthMetrics({
    fromDate: from,
    toDate: to,
  });

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    users: calculateChange(data?.current?.users, data?.previous?.users),

    drivers: calculateChange(data?.current?.drivers, data?.previous?.drivers),

    revenue: calculateChange(data?.current?.revenue, data?.previous?.revenue),

    rides: calculateChange(data?.current?.rides, data?.previous?.rides),
  };
};

/**
 * MODULE 13.2
 * User registration growth.
 */
const getUserGrowth = async ({ fromDate, toDate, granularity = "daily" }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  validateGranularity(granularity);

  const data = await analyticsRepository.getUserGrowth({
    fromDate: from,
    toDate: to,
    granularity,
  });

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    granularity,

    data: aggregateCountGrowth(data, "createdAt", granularity, "registrations"),
  };
};

/**
 * MODULE 13.3
 * Driver registration growth.
 */
const getDriverGrowth = async ({ fromDate, toDate, granularity = "daily" }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  validateGranularity(granularity);

  const data = await analyticsRepository.getDriverGrowth({
    fromDate: from,
    toDate: to,
    granularity,
  });

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    granularity,

    data: aggregateCountGrowth(data, "createdAt", granularity, "registrations"),
  };
};

/**
 * MODULE 13.4
 * Revenue growth.
 *
 * Revenue convention:
 * SUCCESS payments using paidAt.
 */
const getRevenueGrowth = async ({
  fromDate,
  toDate,
  granularity = "daily",
}) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  validateGranularity(granularity);

  const data = await analyticsRepository.getRevenueGrowth({
    fromDate: from,
    toDate: to,
    granularity,
  });

  const buckets = new Map();

  for (const payment of data || []) {
    const period = getBucketKey(payment.paidAt, granularity);

    if (!period) {
      continue;
    }

    if (!buckets.has(period)) {
      buckets.set(period, {
        revenue: 0,
        transactions: 0,
      });
    }

    const bucket = buckets.get(period);

    bucket.revenue += Number(payment.amount) || 0;
    bucket.transactions += 1;
  }

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    granularity,

    data: Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, bucket]) => ({
        period,
        revenue: round(bucket.revenue),
        transactions: bucket.transactions,
      })),
  };
};

/**
 * MODULE 13.5
 * Ride growth and operational performance.
 */
const getRideGrowth = async ({ fromDate, toDate, granularity = "daily" }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  validateGranularity(granularity);

  const data = await analyticsRepository.getRideGrowth({
    fromDate: from,
    toDate: to,
    granularity,
  });

  const buckets = new Map();

  for (const ride of data || []) {
    const period = getBucketKey(ride.createdAt, granularity);

    if (!period) {
      continue;
    }

    if (!buckets.has(period)) {
      buckets.set(period, {
        rides: 0,
        completed: 0,
        cancelled: 0,
        accepted: 0,
        started: 0,
        totalDistance: 0,
        totalDuration: 0,
      });
    }

    const bucket = buckets.get(period);

    bucket.rides += 1;

    if (["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"].includes(ride.status)) {
      bucket.accepted += 1;
    }

    if (ride.status === "STARTED") {
      bucket.started += 1;
    }

    if (ride.status === "COMPLETED") {
      bucket.completed += 1;
    }

    if (ride.status === "CANCELLED") {
      bucket.cancelled += 1;
    }

    bucket.totalDistance += Number(ride.distance) || 0;
    bucket.totalDuration += Number(ride.duration) || 0;
  }

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    granularity,

    data: Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, bucket]) => ({
        period,

        rides: bucket.rides,

        accepted: bucket.accepted,

        started: bucket.started,

        completed: bucket.completed,

        cancelled: bucket.cancelled,

        acceptanceRate:
          bucket.rides > 0 ? round((bucket.accepted / bucket.rides) * 100) : 0,

        completionRate:
          bucket.rides > 0 ? round((bucket.completed / bucket.rides) * 100) : 0,

        cancellationRate:
          bucket.rides > 0 ? round((bucket.cancelled / bucket.rides) * 100) : 0,

        totalDistance: round(bucket.totalDistance),

        totalDuration: round(bucket.totalDuration),
      })),
  };
};

/**
 * MODULE 13.6
 * Vehicle analytics.
 */
const getVehicleAnalytics = async ({ fromDate, toDate }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  const data = await analyticsRepository.getVehicleAnalytics({
    fromDate: from,
    toDate: to,
  });

  if (!Array.isArray(data) || data.length === 0) {
    return {
      period: {
        fromDate: from,
        toDate: to,
      },

      status: "INSUFFICIENT_DATA",

      data: [],
    };
  }

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    status: "OK",

    data: data.map((vehicle) => {
      const totalRides = Number(vehicle.totalRides) || 0;
      const completedRides = Number(vehicle.completedRides) || 0;

      return {
        vehicleType: vehicle.vehicleType,

        totalRides,

        completedRides,

        completionRate:
          totalRides > 0 ? round((completedRides / totalRides) * 100) : 0,

        averageDistance: round(vehicle.averageDistance),

        averageDuration: round(vehicle.averageDuration),
      };
    }),
  };
};

/**
 * MODULE 13.7
 * Privacy-safe heatmap.
 *
 * IMPORTANT:
 * - No rideId
 * - No exact coordinates
 * - No timestamps
 *
 * Coordinates are bucketed into approximate cells.
 */
const getHeatmap = async ({
  fromDate,
  toDate,
  type = "pickup",
  limit = 10000,
}) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  if (!["pickup", "destination"].includes(type)) {
    throw new Error("Heatmap type must be pickup or destination");
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 10000, 1), 10000);

  const data = await analyticsRepository.getHeatmapData({
    fromDate: from,
    toDate: to,
    type,
    limit: safeLimit,
  });

  const grid = new Map();

  /*
   * ~1km-ish geographic aggregation.
   *
   * This deliberately avoids exposing exact user/ride locations.
   */
  const GRID_PRECISION = 2;

  for (const ride of data || []) {
    const latitude =
      type === "destination"
        ? Number(ride.destinationLatitude)
        : Number(ride.pickupLatitude);

    const longitude =
      type === "destination"
        ? Number(ride.destinationLongitude)
        : Number(ride.pickupLongitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      continue;
    }

    const latitudeBucket = Number(latitude.toFixed(GRID_PRECISION));

    const longitudeBucket = Number(longitude.toFixed(GRID_PRECISION));

    const key = `${latitudeBucket}:${longitudeBucket}`;

    if (!grid.has(key)) {
      grid.set(key, {
        latitude: latitudeBucket,
        longitude: longitudeBucket,
        count: 0,
      });
    }

    grid.get(key).count += 1;
  }

  const result = Array.from(grid.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, safeLimit);

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    type,

    status: result.length > 0 ? "OK" : "INSUFFICIENT_DATA",

    data: result,
  };
};

/**
 * MODULE 13.8
 * Cohort retention analytics.
 *
 * Retention is calculated from actual ride activity only.
 * No synthetic retention data is generated.
 */
const getRetention = async ({ fromDate, toDate }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  const data = await analyticsRepository.getRetentionData({
    fromDate: from,
    toDate: to,
  });

  const users = Array.isArray(data?.users) ? data.users : [];

  const rides = Array.isArray(data?.rides) ? data.rides : [];

  if (users.length === 0) {
    return {
      period: {
        fromDate: from,
        toDate: to,
      },

      status: "INSUFFICIENT_DATA",

      cohorts: [],

      summary: {
        totalUsers: 0,
        retainedUsers: 0,
        retentionRate: 0,
      },
    };
  }

  const rideDatesByUser = new Map();

  for (const ride of rides) {
    const rideDate = new Date(ride.createdAt);

    if (Number.isNaN(rideDate.getTime())) {
      continue;
    }

    if (!rideDatesByUser.has(ride.userId)) {
      rideDatesByUser.set(ride.userId, []);
    }

    rideDatesByUser.get(ride.userId).push(rideDate);
  }

  const cohorts = new Map();

  for (const user of users) {
    const registrationDate = new Date(user.createdAt);

    if (Number.isNaN(registrationDate.getTime())) {
      continue;
    }

    const cohortKey = `${registrationDate.getUTCFullYear()}-${String(
      registrationDate.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    if (!cohorts.has(cohortKey)) {
      cohorts.set(cohortKey, {
        cohort: cohortKey,
        users: 0,
        month0: 0,
        month1: 0,
        month2: 0,
      });
    }

    const cohort = cohorts.get(cohortKey);

    cohort.users += 1;

    const userRides = rideDatesByUser.get(user.id) || [];

    const activeMonths = new Set();

    for (const rideDate of userRides) {
      if (rideDate < registrationDate) {
        continue;
      }

      const monthDifference =
        (rideDate.getUTCFullYear() - registrationDate.getUTCFullYear()) * 12 +
        rideDate.getUTCMonth() -
        registrationDate.getUTCMonth();

      if (monthDifference >= 0 && monthDifference <= 2) {
        activeMonths.add(monthDifference);
      }
    }

    if (activeMonths.has(0)) {
      cohort.month0 += 1;
    }

    if (activeMonths.has(1)) {
      cohort.month1 += 1;
    }

    if (activeMonths.has(2)) {
      cohort.month2 += 1;
    }
  }

  const cohortResults = Array.from(cohorts.values())
    .sort((a, b) => a.cohort.localeCompare(b.cohort))
    .map((cohort) => {
      const [year, month] = cohort.cohort.split("-").map(Number);

      const firstMonth = new Date(Date.UTC(year, month - 1, 1));

      const month1End = new Date(Date.UTC(year, month + 1, 1));

      const month2End = new Date(Date.UTC(year, month + 2, 1));

      const month1Available = month1End <= to;

      const month2Available = month2End <= to;

      return {
        cohort: cohort.cohort,

        users: cohort.users,

        month0: cohort.month0,

        month0Rate:
          cohort.users > 0 ? round((cohort.month0 / cohort.users) * 100) : 0,

        month1: month1Available ? cohort.month1 : null,

        month1Rate: month1Available
          ? round((cohort.month1 / cohort.users) * 100)
          : null,

        month2: month2Available ? cohort.month2 : null,

        month2Rate: month2Available
          ? round((cohort.month2 / cohort.users) * 100)
          : null,
      };
    });

  const retainedUsers = users.filter((user) => {
    const registrationDate = new Date(user.createdAt);

    const userRides = rideDatesByUser.get(user.id) || [];

    return userRides.some((rideDate) => rideDate > registrationDate);
  }).length;

  return {
    period: {
      fromDate: from,
      toDate: to,
    },

    status: "OK",

    cohorts: cohortResults,

    summary: {
      totalUsers: users.length,

      retainedUsers,

      retentionRate:
        users.length > 0 ? round((retainedUsers / users.length) * 100) : 0,
    },
  };
};

/**
 * MODULE 13.5
 * City analytics.
 *
 * The repository intentionally returns DATA_UNAVAILABLE
 * because Ride currently has no reliable SupportedCity
 * relation.
 */
const getCityAnalytics = async ({ fromDate, toDate }) => {
  const { from, to } = validateRange({
    fromDate,
    toDate,
  });

  const result = await analyticsRepository.getCityAnalytics({
    fromDate: from,
    toDate: to,
  });

  return {
    ...result,

    period: {
      fromDate: from,
      toDate: to,
    },
  };
};

const getGrowthCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("growth", filters, adminContext, () => getGrowth(filters));

const getUserGrowthCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("users", filters, adminContext, () =>
    getUserGrowth(filters),
  );

const getDriverGrowthCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("drivers", filters, adminContext, () =>
    getDriverGrowth(filters),
  );

const getRevenueGrowthCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("revenue", filters, adminContext, () =>
    getRevenueGrowth(filters),
  );

const getRideGrowthCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("rides", filters, adminContext, () =>
    getRideGrowth(filters),
  );

const getVehicleAnalyticsCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("vehicles", filters, adminContext, () =>
    getVehicleAnalytics(filters),
  );

const getHeatmapCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache(`heatmap:${filters.type || "pickup"}`, filters, adminContext, () =>
    getHeatmap(filters),
  );

const getRetentionCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("retention", filters, adminContext, () =>
    getRetention(filters),
  );

const getCityAnalyticsCached = (filters = {}, adminContext = {}) =>
  withAnalyticsCache("cities", filters, adminContext, () =>
    getCityAnalytics(filters),
  );

const escapeCsv = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/^[=+\-@]/.test(stringValue)) {
    stringValue = `'${stringValue}`;
  }

  if (/[,"\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const exportAnalyticsCsv = async (
  { type, fromDate, toDate, granularity = "daily", limit = 10000 },
  adminContext = {},
) => {
  const filters = { type, fromDate, toDate, granularity, limit };
  let result;

  switch (type) {
    case "growth":
      result = await getGrowthCached(filters, adminContext);
      break;
    case "users":
      result = await getUserGrowthCached(filters, adminContext);
      break;
    case "drivers":
      result = await getDriverGrowthCached(filters, adminContext);
      break;
    case "revenue":
      result = await getRevenueGrowthCached(filters, adminContext);
      break;
    case "rides":
      result = await getRideGrowthCached(filters, adminContext);
      break;
    case "vehicles":
      result = await getVehicleAnalyticsCached(filters, adminContext);
      break;
    case "heatmap":
      result = await getHeatmapCached(filters, adminContext);
      break;
    case "retention":
      result = await getRetentionCached(filters, adminContext);
      break;
    case "cities":
      result = await getCityAnalyticsCached(filters, adminContext);
      break;
    default:
      throw new Error("Invalid analytics export type.");
  }

  const rows = [
    ["analyticsType", "fromDate", "toDate", "data"],
    [
      type,
      result.period?.fromDate || fromDate || "",
      result.period?.toDate || toDate || "",
      JSON.stringify(result.data ?? result),
    ],
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  if (adminContext.adminId) {
    await createAuditLog({
      adminId: adminContext.adminId,
      action: "EXPORT_ANALYTICS",
      entity: "ANALYTICS",
      entityId: type,
      metadata: {
        analyticsType: type,
        fromDate: fromDate || null,
        toDate: toDate || null,
        granularity: granularity || null,
        format: "CSV",
      },
      ipAddress: adminContext.ipAddress || null,
      userAgent: adminContext.userAgent || null,
    });
  }

  return csv;
};

module.exports = {
  getGrowth: getGrowthCached,
  getUserGrowth: getUserGrowthCached,
  getDriverGrowth: getDriverGrowthCached,
  getRevenueGrowth: getRevenueGrowthCached,
  getRideGrowth: getRideGrowthCached,
  getVehicleAnalytics: getVehicleAnalyticsCached,
  getHeatmap: getHeatmapCached,
  getRetention: getRetentionCached,
  getCityAnalytics: getCityAnalyticsCached,
  exportAnalyticsCsv,
};
