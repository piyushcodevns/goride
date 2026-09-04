const analyticsRepository = require("../../repositories/admin/adminAnalytics.repository");

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
        percentageChange = round(
            (absoluteChange / Math.abs(previousValue)) * 100
        );
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
const DAY_MS = 24 * 60 * 60 * 1000;

const validateRange = ({ fromDate, toDate }) => {
    const now = new Date();

    const to = toDate
        ? new Date(toDate)
        : now;

    if (Number.isNaN(to.getTime())) {
        throw new Error("Invalid analytics toDate");
    }

    const from = fromDate
        ? new Date(fromDate)
        : new Date(
              to.getTime() -
                  DEFAULT_ANALYTICS_DAYS * DAY_MS
          );

    if (Number.isNaN(from.getTime())) {
        throw new Error("Invalid analytics fromDate");
    }

    if (from >= to) {
        throw new Error(
            "Analytics fromDate must be before toDate"
        );
    }

    return { from, to };
};

const validateGranularity = (granularity) => {
    const allowed = ["daily", "weekly", "monthly"];

    if (!allowed.includes(granularity)) {
        throw new Error(
            "Analytics granularity must be daily, weekly, or monthly"
        );
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

    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const aggregateCountGrowth = (records, dateField, granularity) => {
    const buckets = new Map();

    for (const record of records) {
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
            registrations: count,
        }));
};
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
        users: calculateChange(
            data.current.users,
            data.previous.users
        ),
        drivers: calculateChange(
            data.current.drivers,
            data.previous.drivers
        ),
        revenue: calculateChange(
            data.current.revenue,
            data.previous.revenue
        ),
        rides: calculateChange(
            data.current.rides,
            data.previous.rides
        ),
    };
};

const getUserGrowth = async ({
    fromDate,
    toDate,
    granularity = "daily",
}) => {
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

    return aggregateCountGrowth(data, "createdAt", granularity);
};

const getDriverGrowth = async ({
    fromDate,
    toDate,
    granularity = "daily",
}) => {
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

    return aggregateCountGrowth(data, "createdAt", granularity);
};

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

    for (const payment of data) {
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

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, bucket]) => ({
            period,
            revenue: round(bucket.revenue),
            transactions: bucket.transactions,
        }));
};
const getRideGrowth = async ({
    fromDate,
    toDate,
    granularity = "daily",
}) => {
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

    for (const ride of data) {
        const period = getBucketKey(ride.createdAt, granularity);

        if (!period) {
            continue;
        }

        if (!buckets.has(period)) {
            buckets.set(period, {
                rides: 0,
                completed: 0,
                cancelled: 0,
                totalDistance: 0,
                totalDuration: 0,
            });
        }

        const bucket = buckets.get(period);

        bucket.rides += 1;

        if (ride.status === "COMPLETED") {
            bucket.completed += 1;
        }

        if (ride.status === "CANCELLED") {
            bucket.cancelled += 1;
        }

        bucket.totalDistance += Number(ride.distance) || 0;
        bucket.totalDuration += Number(ride.duration) || 0;
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, bucket]) => ({
            period,
            rides: bucket.rides,
            completed: bucket.completed,
            cancelled: bucket.cancelled,
            completionRate:
                bucket.rides > 0
                    ? round((bucket.completed / bucket.rides) * 100)
                    : 0,
            cancellationRate:
                bucket.rides > 0
                    ? round((bucket.cancelled / bucket.rides) * 100)
                    : 0,
            totalDistance: round(bucket.totalDistance),
            totalDuration: round(bucket.totalDuration),
        }));
};
const getVehicleAnalytics = async ({ fromDate, toDate }) => {
    const { from, to } = validateRange({
        fromDate,
        toDate,
    });

    const data = await analyticsRepository.getVehicleAnalytics({
        fromDate: from,
        toDate: to,
    });

    return data.map((vehicle) => {
        const totalRides = Number(vehicle.totalRides) || 0;
        const completedRides = Number(vehicle.completedRides) || 0;

        return {
            vehicleType: vehicle.vehicleType,
            totalRides,
            completedRides,
            completionRate:
                totalRides > 0
                    ? round((completedRides / totalRides) * 100)
                    : 0,
            averageDistance: round(vehicle.averageDistance),
            averageDuration: round(vehicle.averageDuration),
        };
    });
};

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
        throw new Error(
            "Heatmap type must be pickup or destination"
        );
    }

    const data = await analyticsRepository.getHeatmapData({
        fromDate: from,
        toDate: to,
        type,
        limit,
    });

    return data.map((ride) => {
        if (type === "destination") {
            return {
                rideId: ride.id,
                latitude: ride.destinationLatitude,
                longitude: ride.destinationLongitude,
                createdAt: ride.createdAt,
            };
        }

        return {
            rideId: ride.id,
            latitude: ride.pickupLatitude,
            longitude: ride.pickupLongitude,
            createdAt: ride.createdAt,
        };
    });
};

const getRetention = async ({ fromDate, toDate }) => {
    const { from, to } = validateRange({
        fromDate,
        toDate,
    });

    const data = await analyticsRepository.getRetentionData({
        fromDate: from,
        toDate: to,
    });

    if (!data.users.length) {
        return {
            cohorts: [],
            summary: {
                totalUsers: 0,
                retainedUsers: 0,
                retentionRate: 0,
            },
        };
    }

    const rideDatesByUser = new Map();

    for (const ride of data.rides) {
        if (!rideDatesByUser.has(ride.userId)) {
            rideDatesByUser.set(ride.userId, []);
        }

        rideDatesByUser
            .get(ride.userId)
            .push(new Date(ride.createdAt));
    }

    const cohorts = new Map();

    for (const user of data.users) {
        const registrationDate = new Date(user.createdAt);

        const cohortKey =
            `${registrationDate.getUTCFullYear()}-${String(
                registrationDate.getUTCMonth() + 1
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

        const rides = rideDatesByUser.get(user.id) || [];

        const activeMonths = new Set();

        for (const rideDate of rides) {
            const months =
                (rideDate.getUTCFullYear() -
                    registrationDate.getUTCFullYear()) *
                    12 +
                rideDate.getUTCMonth() -
                registrationDate.getUTCMonth();

            if (months >= 0 && months <= 2) {
                activeMonths.add(months);
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

    const cohortResults = Array.from(cohorts.values()).map(
        (cohort) => {
            const firstMonth = new Date(
                `${cohort.cohort}-01T00:00:00.000Z`
            );

            const month1Available =
                new Date(
                    firstMonth.getUTCFullYear(),
                    firstMonth.getUTCMonth() + 2,
                    1
                ) <= to;

            const month2Available =
                new Date(
                    firstMonth.getUTCFullYear(),
                    firstMonth.getUTCMonth() + 3,
                    1
                ) <= to;

            return {
                cohort: cohort.cohort,
                users: cohort.users,

                month0: cohort.month0,
                month0Rate:
                    cohort.users > 0
                        ? round(
                              (cohort.month0 / cohort.users) * 100
                          )
                        : 0,

                month1: month1Available
                    ? cohort.month1
                    : null,
                month1Rate: month1Available
                    ? round(
                          (cohort.month1 / cohort.users) * 100
                      )
                    : null,

                month2: month2Available
                    ? cohort.month2
                    : null,
                month2Rate: month2Available
                    ? round(
                          (cohort.month2 / cohort.users) * 100
                      )
                    : null,
            };
        }
    );

    const retainedUsers = data.users.filter((user) => {
        const registrationDate = new Date(user.createdAt);

        return (rideDatesByUser.get(user.id) || []).some(
            (rideDate) => rideDate > registrationDate
        );
    }).length;

    return {
        cohorts: cohortResults,
        summary: {
            totalUsers: data.users.length,
            retainedUsers,
            retentionRate:
                data.users.length > 0
                    ? round(
                          (retainedUsers / data.users.length) * 100
                      )
                    : 0,
        },
    };
};

const getCityAnalytics = async ({ fromDate, toDate }) => {
    const { from, to } = validateRange({
        fromDate,
        toDate,
    });

    return analyticsRepository.getCityAnalytics({
        fromDate: from,
        toDate: to,
    });
};

module.exports = {
    getGrowth,
    getUserGrowth,
    getDriverGrowth,
    getRevenueGrowth,
    getRideGrowth,
    getVehicleAnalytics,
    getHeatmap,
    getRetention,
    getCityAnalytics,
};





