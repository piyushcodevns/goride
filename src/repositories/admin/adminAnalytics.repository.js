const prisma = require("../../config/prisma");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ANALYTICS_RANGE_DAYS = 366;

const toValidDate = (value, fieldName) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid analytics ${fieldName}`);
    }

    return date;
};

const getPeriodBounds = (fromDate, toDate) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    if (from >= to) {
        throw new Error("Analytics fromDate must be before toDate");
    }

    const periodMs = to.getTime() - from.getTime();
    const periodDays = periodMs / DAY_MS;

    if (periodDays > MAX_ANALYTICS_RANGE_DAYS) {
        throw new Error(
            `Analytics date range cannot exceed ${MAX_ANALYTICS_RANGE_DAYS} days`
        );
    }

    return {
        from,
        to,
        previousFrom: new Date(from.getTime() - periodMs),
        previousTo: new Date(from.getTime()),
    };
};

/**
 * Overall growth comparison.
 *
 * Authoritative sources:
 * - Users: USER registrations
 * - Drivers: Driver records
 * - Revenue: SUCCESS payments using paidAt
 * - Rides: Ride records
 */
const getGrowthMetrics = async ({ fromDate, toDate }) => {
    const { from, to, previousFrom, previousTo } =
        getPeriodBounds(fromDate, toDate);

    const [
        currentUsers,
        previousUsers,
        currentDrivers,
        previousDrivers,
        currentRevenue,
        previousRevenue,
        currentRides,
        previousRides,
    ] = await Promise.all([
        prisma.user.count({
            where: {
                role: "USER",
                createdAt: {
                    gte: from,
                    lt: to,
                },
            },
        }),

        prisma.user.count({
            where: {
                role: "USER",
                createdAt: {
                    gte: previousFrom,
                    lt: previousTo,
                },
            },
        }),

        prisma.driver.count({
            where: {
                createdAt: {
                    gte: from,
                    lt: to,
                },
            },
        }),

        prisma.driver.count({
            where: {
                createdAt: {
                    gte: previousFrom,
                    lt: previousTo,
                },
            },
        }),

        prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: "SUCCESS",
                paidAt: {
                    gte: from,
                    lt: to,
                },
            },
        }),

        prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: "SUCCESS",
                paidAt: {
                    gte: previousFrom,
                    lt: previousTo,
                },
            },
        }),

        prisma.ride.count({
            where: {
                createdAt: {
                    gte: from,
                    lt: to,
                },
            },
        }),

        prisma.ride.count({
            where: {
                createdAt: {
                    gte: previousFrom,
                    lt: previousTo,
                },
            },
        }),
    ]);

    return {
        current: {
            users: currentUsers,
            drivers: currentDrivers,
            revenue: currentRevenue._sum.amount || 0,
            rides: currentRides,
        },

        previous: {
            users: previousUsers,
            drivers: previousDrivers,
            revenue: previousRevenue._sum.amount || 0,
            rides: previousRides,
        },
    };
};

/**
 * User growth source data.
 *
 * Only timestamp is required by the service.
 */
const getUserGrowth = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    return prisma.user.findMany({
        where: {
            role: "USER",
            createdAt: {
                gte: from,
                lt: to,
            },
        },

        select: {
            createdAt: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });
};

/**
 * Driver growth source data.
 */
const getDriverGrowth = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    return prisma.driver.findMany({
        where: {
            createdAt: {
                gte: from,
                lt: to,
            },
        },

        select: {
            createdAt: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });
};

/**
 * Revenue source data.
 *
 * ONLY successful payments with a valid paidAt are included.
 */
const getRevenueGrowth = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    return prisma.payment.findMany({
        where: {
            status: "SUCCESS",

            paidAt: {
                gte: from,
                lt: to,
                not: null,
            },
        },

        select: {
            amount: true,
            paidAt: true,
        },

        orderBy: {
            paidAt: "asc",
        },
    });
};

/**
 * Ride growth source data.
 *
 * Only fields required by analytics are selected.
 */
const getRideGrowth = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    return prisma.ride.findMany({
        where: {
            createdAt: {
                gte: from,
                lt: to,
            },
        },

        select: {
            status: true,
            distance: true,
            duration: true,
            createdAt: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });
};

/**
 * Vehicle performance analytics.
 *
 * Database performs grouping and averages.
 */
const getVehicleAnalytics = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    const rides = await prisma.ride.groupBy({
        by: ["vehicleType"],

        where: {
            createdAt: {
                gte: from,
                lt: to,
            },
        },

        _count: {
            id: true,
        },

        _avg: {
            distance: true,
            duration: true,
        },
    });

    if (!rides.length) {
        return [];
    }

    const completedRides = await prisma.ride.groupBy({
        by: ["vehicleType"],

        where: {
            status: "COMPLETED",

            createdAt: {
                gte: from,
                lt: to,
            },
        },

        _count: {
            id: true,
        },
    });

    const completedMap = new Map(
        completedRides.map((item) => [
            item.vehicleType,
            item._count.id,
        ])
    );

    return rides.map((item) => ({
        vehicleType: item.vehicleType,

        totalRides: item._count.id,

        completedRides:
            completedMap.get(item.vehicleType) || 0,

        averageDistance: item._avg.distance,

        averageDuration: item._avg.duration,
    }));
};

/**
 * Heatmap source data.
 *
 * IMPORTANT:
 * This repository intentionally does NOT return:
 * - ride id
 * - user id
 * - timestamps
 *
 * Service layer performs geographic bucketing.
 */
const getHeatmapData = async ({
    fromDate,
    toDate,
    type = "pickup",
    limit = 10000,
}) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    if (!["pickup", "destination"].includes(type)) {
        throw new Error(
            "Heatmap type must be pickup or destination"
        );
    }

    const safeLimit = Math.min(
        Math.max(Number(limit) || 10000, 1),
        10000
    );

    const coordinateFilter =
        type === "destination"
            ? {
                  destinationLatitude: {
                      not: null,
                  },

                  destinationLongitude: {
                      not: null,
                  },
              }
            : {
                  pickupLatitude: {
                      not: null,
                  },

                  pickupLongitude: {
                      not: null,
                  },
              };

    return prisma.ride.findMany({
        where: {
            createdAt: {
                gte: from,
                lt: to,
            },

            ...coordinateFilter,
        },

        select: {
            pickupLatitude: true,
            pickupLongitude: true,
            destinationLatitude: true,
            destinationLongitude: true,
        },

        take: safeLimit,
    });
};

/**
 * Retention source data.
 *
 * Users are limited to the requested cohort period.
 * Rides are limited to the requested period + enough
 * future time for the service to evaluate month 0/1/2.
 */
const getRetentionData = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    if (from >= to) {
        throw new Error("Analytics fromDate must be before toDate");
    }

    const users = await prisma.user.findMany({
        where: {
            role: "USER",

            createdAt: {
                gte: from,
                lt: to,
            },
        },

        select: {
            id: true,
            createdAt: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });

    if (!users.length) {
        return {
            users: [],
            rides: [],
        };
    }

    const userIds = users.map((user) => user.id);

    /*
     * We need activity after registration for retention.
     * Since the analytics range itself is bounded to 366 days,
     * cap the activity lookup to a deterministic upper bound.
     */
    const retentionEnd = new Date(
        to.getTime() + 3 * 31 * DAY_MS
    );

    const rides = await prisma.ride.findMany({
        where: {
            userId: {
                in: userIds,
            },

            createdAt: {
                gte: from,
                lt: retentionEnd,
            },
        },

        select: {
            userId: true,
            createdAt: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });

    return {
        users,
        rides,
    };
};

/**
 * City analytics intentionally remains unavailable.
 *
 * SupportedCity exists, but Ride has no reliable structured
 * city relation. Do NOT infer city from pickup strings or
 * coordinates.
 */
const getCityAnalytics = async ({ fromDate, toDate }) => {
    const from = toValidDate(fromDate, "fromDate");
    const to = toValidDate(toDate, "toDate");

    return {
        supported: false,

        status: "DATA_UNAVAILABLE",

        reason:
            "Ride records do not currently have a reliable structured city relation",

        data: [],

        period: {
            fromDate: from,
            toDate: to,
        },
    };
};

module.exports = {
    getPeriodBounds,
    getGrowthMetrics,
    getUserGrowth,
    getDriverGrowth,
    getRevenueGrowth,
    getRideGrowth,
    getVehicleAnalytics,
    getHeatmapData,
    getRetentionData,
    getCityAnalytics,
};