const prisma = require("../../config/prisma");

const getPeriodBounds = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new Error("Invalid analytics date range");
    }

    if (from >= to) {
        throw new Error("Analytics fromDate must be before toDate");
    }

    const periodMs = to.getTime() - from.getTime();

    return {
        from,
        to,
        previousFrom: new Date(from.getTime() - periodMs),
        previousTo: new Date(from.getTime()),
    };
};

/**
 * Growth summary.
 *
 * Uses:
 * - User.role = USER
 * - Driver records directly
 * - Payment.status = SUCCESS
 * - Ride records directly
 */
const getGrowthMetrics = async ({ fromDate, toDate }) => {
    const { from, to, previousFrom, previousTo } = getPeriodBounds(
        fromDate,
        toDate
    );

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
 * User growth records.
 *
 * Service layer converts these timestamps into requested
 * daily/weekly/monthly buckets.
 */
const getUserGrowth = async ({ fromDate, toDate }) => {
    return prisma.user.findMany({
        where: {
            role: "USER",
            createdAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
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
};

/**
 * Driver growth records.
 */
const getDriverGrowth = async ({ fromDate, toDate }) => {
    return prisma.driver.findMany({
        where: {
            createdAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
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
};

/**
 * Revenue records.
 *
 * ONLY successful payments are included.
 */
const getRevenueGrowth = async ({ fromDate, toDate }) => {
    return prisma.payment.findMany({
        where: {
            status: "SUCCESS",
            paidAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
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
 * Ride growth.
 *
 * Only fields required for analytics are selected.
 */
const getRideGrowth = async ({ fromDate, toDate }) => {
    return prisma.ride.findMany({
        where: {
            createdAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
            },
        },
        select: {
            id: true,
            status: true,
            vehicleType: true,
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
 * Uses ride-level operational metrics rather than duplicating
 * simple vehicle revenue breakdowns already available in Reports.
 */
const getVehicleAnalytics = async ({ fromDate, toDate }) => {
    const rides = await prisma.ride.groupBy({
        by: ["vehicleType"],
        where: {
            createdAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
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

    const completedRides = await prisma.ride.groupBy({
        by: ["vehicleType"],
        where: {
            status: "COMPLETED",
            createdAt: {
                gte: new Date(fromDate),
                lt: new Date(toDate),
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
        completedRides: completedMap.get(item.vehicleType) || 0,
        averageDistance: item._avg.distance,
        averageDuration: item._avg.duration,
    }));
};

/**
 * Heatmap data.
 *
 * Only real stored coordinates are used.
 * Maximum 10,000 records prevents an unbounded response.
 */
const getHeatmapData = async ({
    fromDate,
    toDate,
    type = "pickup",
    limit = 10000,
}) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 10000, 1), 10000);

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
                gte: new Date(fromDate),
                lt: new Date(toDate),
            },
            ...coordinateFilter,
        },
        select: {
            id: true,
            pickupLatitude: true,
            pickupLongitude: true,
            destinationLatitude: true,
            destinationLongitude: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: safeLimit,
    });
};

/**
 * Retention analytics source data.
 *
 * Cohort = user registration date.
 * Activity = subsequent ride activity.
 *
 * Service layer owns cohort/month calculations.
 */
const getRetentionData = async ({ fromDate, toDate }) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

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

    const rides = await prisma.ride.findMany({
        where: {
            userId: {
                in: userIds,
            },
            createdAt: {
                gte: from,
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
 * City analytics is intentionally unsupported until Ride has a
 * reliable structured city relation.
 *
 * SupportedCity exists in the schema, but Ride currently has no
 * cityId relation. We must not fabricate city information from
 * pickup strings or coordinates.
 */
const getCityAnalytics = async ({ fromDate, toDate }) => {
    return {
        supported: false,
        reason:
            "Ride records do not currently have a reliable structured city relation",
        data: [],
        period: {
            fromDate,
            toDate,
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
