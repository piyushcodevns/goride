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
      user: { select: { id: true, fullName: true } },
      driver: { select: { id: true, user: { select: { fullName: true } } } },
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
      user: { select: { id: true, fullName: true } },
    },
  });
};

const getRevenueGraph = async () => {
  return prisma.$queryRaw`
    WITH dates AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
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
        AND "paidAt" >= CURRENT_DATE - INTERVAL '6 days'
        AND "paidAt" < CURRENT_DATE + INTERVAL '1 day'
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
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS date
    ),
    rides AS (
      SELECT
        ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date AS date,
        COUNT(*)::int AS rides
      FROM "Ride"
      WHERE
        "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
        AND "createdAt" < CURRENT_DATE + INTERVAL '1 day'
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
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
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
        AND "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
        AND "createdAt" < CURRENT_DATE + INTERVAL '1 day'
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

module.exports = {
  getUserStats,
  getDriverStats,
  getDriverAvailabilityStats,
  getRideStats,
  getPaymentStats,
  getRevenueStats,
  getTodayStats,
  getRecentRides,
  getRecentPayments,
  getRevenueGraph,
  getRideGraph,
  getUserRegistrationGraph,
};
