const prisma = require("../../config/prisma");

const getUserStats = () => {
  const totalUsers = prisma.user.count({
    where: { role: "USER" },
  });

  const activeUsers = prisma.user.count({
    where: {
      role: "USER",
      isActive: true,
    },
  });

  const inactiveUsers = prisma.user.count({
    where: {
      role: "USER",
      isActive: false,
    },
  });

  const verifiedUsers = prisma.user.count({
    where: {
      role: "USER",
      isVerified: true,
    },
  });

  return Promise.all([totalUsers, activeUsers, inactiveUsers, verifiedUsers]);
};

const getDriverStats = () => {
  return prisma.driver.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });
};

const getDriverAvailabilityStats = () => {
  return prisma.driver.groupBy({
    by: ["availability"],
    _count: {
      availability: true,
    },
  });
};

const getVehicleStats = () => {
  return prisma.vehicle.count();
};

const getRideStats = () => {
  return prisma.ride.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });
};

const getPaymentStats = () => {
  return prisma.payment.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });
};

const getRevenueStats = () => {
  return prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: "SUCCESS",
    },
  });
};

const getRevenuePeriodStats = async () => {
  return prisma.$queryRaw`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN "paidAt" >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
             AND "paidAt" < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day'
            THEN amount
            ELSE 0
          END
        ),
        0
      ) AS daily_revenue,

      COALESCE(
        SUM(
          CASE
            WHEN "paidAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
             AND "paidAt" < date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 week'
            THEN amount
            ELSE 0
          END
        ),
        0
      ) AS weekly_revenue,

      COALESCE(
        SUM(
          CASE
            WHEN "paidAt" >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
             AND "paidAt" < date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 month'
            THEN amount
            ELSE 0
          END
        ),
        0
      ) AS monthly_revenue

    FROM "Payment"
    WHERE
      status = 'SUCCESS'
      AND "paidAt" IS NOT NULL;
  `;
};

const getTodayStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const todayRides = prisma.ride.count({
    where: {
      createdAt: {
        gte: startOfToday,
        lt: startOfTomorrow,
      },
    },
  });

  const todayCompletedRides = prisma.ride.count({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: startOfToday,
        lt: startOfTomorrow,
      },
    },
  });

  const todayCancelledRides = prisma.ride.count({
    where: {
      status: "CANCELLED",
      createdAt: {
        gte: startOfToday,
        lt: startOfTomorrow,
      },
    },
  });

  const todayRevenueResult = prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: "SUCCESS",
      paidAt: {
        gte: startOfToday,
        lt: startOfTomorrow,
      },
    },
  });

  return Promise.all([
    todayRides,
    todayCompletedRides,
    todayCancelledRides,
    todayRevenueResult,
  ]);
};

const getActiveRideCount = () => {
  return prisma.ride.count({
    where: {
      status: {
        in: ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED"],
      },
    },
  });
};

const getCouponUsageCount = () => {
  return prisma.couponUsage.count();
};

const getNotificationStats = () => {
  return prisma.notification.count({
    where: {
      status: "SENT",
    },
  });
};

const getRecentRides = () => {
  return prisma.ride.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      pickup: true,
      destination: true,
      status: true,
      vehicleType: true,
      estimatedFare: true,
      finalFare: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
      driver: {
        select: {
          id: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });
};

const getRecentPayments = () => {
  return prisma.payment.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
};

const getRevenueGraph = async () => {
  return prisma.$queryRaw`
    WITH dates AS (
      SELECT generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days',
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
        INTERVAL '1 day'
      )::date AS date
    ),
    revenue AS (
      SELECT
        ("paidAt" AT TIME ZONE 'Asia/Kolkata')::date AS date,
        COALESCE(SUM(amount), 0) AS revenue
      FROM "Payment"
      WHERE
        status = 'SUCCESS'
        AND "paidAt" IS NOT NULL
        AND ("paidAt" AT TIME ZONE 'Asia/Kolkata')::date >=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days'
        AND ("paidAt" AT TIME ZONE 'Asia/Kolkata')::date <=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      GROUP BY ("paidAt" AT TIME ZONE 'Asia/Kolkata')::date
    )
    SELECT
      dates.date,
      COALESCE(revenue.revenue, 0) AS revenue
    FROM dates
    LEFT JOIN revenue
      ON revenue.date = dates.date
    ORDER BY dates.date ASC;
  `;
};

const getRideGraph = async () => {
  return prisma.$queryRaw`
    WITH dates AS (
      SELECT generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days',
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
        INTERVAL '1 day'
      )::date AS date
    ),
    rides AS (
      SELECT
        ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date AS date,
        COUNT(*)::int AS rides
      FROM "Ride"
      WHERE
        ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date >=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days'
        AND ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date <=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      GROUP BY ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date
    )
    SELECT
      dates.date,
      COALESCE(rides.rides, 0)::int AS rides
    FROM dates
    LEFT JOIN rides
      ON rides.date = dates.date
    ORDER BY dates.date ASC;
  `;
};

const getUserRegistrationGraph = async () => {
  return prisma.$queryRaw`
    WITH dates AS (
      SELECT generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days',
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
        INTERVAL '1 day'
      )::date AS date
    ),
    registrations AS (
      SELECT
        ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date AS date,
        COUNT(*)::int AS registrations
      FROM "User"
      WHERE
        role = 'USER'
        AND ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date >=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days'
        AND ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date <=
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      GROUP BY ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date
    )
    SELECT
      dates.date,
      COALESCE(registrations.registrations, 0)::int AS registrations
    FROM dates
    LEFT JOIN registrations
      ON registrations.date = dates.date
    ORDER BY dates.date ASC;
  `;
};

const getPeakHoursGraph = async () => {
  return prisma.$queryRaw`
    WITH hours AS (
      SELECT generate_series(0, 23) AS hour
    ),
    rides AS (
      SELECT
        EXTRACT(
          HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Kolkata')
        )::int AS hour,
        COUNT(*)::int AS rides
      FROM "Ride"
      GROUP BY EXTRACT(
        HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Kolkata')
      )
    )
    SELECT
      hours.hour,
      COALESCE(rides.rides, 0)::int AS rides
    FROM hours
    LEFT JOIN rides
      ON rides.hour = hours.hour
    ORDER BY hours.hour ASC;
  `;
};

const getCityWiseRevenueGraph = async () => {
  return prisma.$queryRaw`
    SELECT
      COALESCE(
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 2)), ''),
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 1)), ''),
        'UNKNOWN'
      ) AS city,
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM "Payment" p
    INNER JOIN "Ride" r
      ON r.id = p."rideId"
    WHERE
      p.status = 'SUCCESS'
    GROUP BY city
    ORDER BY revenue DESC;
  `;
};

const getVehicleWiseRevenueGraph = async () => {
  return prisma.$queryRaw`
    SELECT
      r."vehicleType" AS "vehicleType",
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM "Payment" p
    INNER JOIN "Ride" r
      ON r.id = p."rideId"
    WHERE
      p.status = 'SUCCESS'
    GROUP BY r."vehicleType"
    ORDER BY revenue DESC;
  `;
};

const getCancellationRate = async () => {
  const result = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
    FROM "Ride";
  `;

  const total = Number(result[0]?.total || 0);
  const cancelled = Number(result[0]?.cancelled || 0);

  return {
    total,
    cancelled,
    rate: total === 0 ? 0 : Number(((cancelled / total) * 100).toFixed(2)),
  };
};

module.exports = {
  getUserStats,
  getDriverStats,
  getDriverAvailabilityStats,
  getVehicleStats,
  getRideStats,
  getPaymentStats,
  getRevenueStats,
  getRevenuePeriodStats,
  getTodayStats,
  getActiveRideCount,
  getCouponUsageCount,
  getNotificationStats,
  getRecentRides,
  getRecentPayments,
  getRevenueGraph,
  getRideGraph,
  getUserRegistrationGraph,
  getPeakHoursGraph,
  getCityWiseRevenueGraph,
  getVehicleWiseRevenueGraph,
  getCancellationRate,
};
