const dashboardRepository = require("../../repositories/admin/adminDashboard.repository");

const getDashboardData = async () => {
  const [
    [totalUsers, activeUsers, inactiveUsers, verifiedUsers],
    driverStatusCounts,
    driverAvailabilityCounts,
    rideStatusCounts,
    paymentStatusCounts,
    revenueResult,
    [todayRides, todayCompletedRides, todayCancelledRides, todayRevenueResult],
    recentRides,
    recentPayments,
    revenueGraphResult,
    rideGraphResult,
    userRegistrationGraphResult,
  ] = await Promise.all([
    dashboardRepository.getUserStats(),
    dashboardRepository.getDriverStats(),
    dashboardRepository.getDriverAvailabilityStats(),
    dashboardRepository.getRideStats(),
    dashboardRepository.getPaymentStats(),
    dashboardRepository.getRevenueStats(),
    dashboardRepository.getTodayStats(),
    dashboardRepository.getRecentRides(),
    dashboardRepository.getRecentPayments(),
    dashboardRepository.getRevenueGraph(),
    dashboardRepository.getRideGraph(),
    dashboardRepository.getUserRegistrationGraph(),
  ]);

  // =========================
  // DRIVER STATUS
  // =========================

  const driverStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };

  for (const { status, _count } of driverStatusCounts) {
    const count = _count.status;

    driverStats[status.toLowerCase()] = count;
    driverStats.total += count;
  }

  // =========================
  // DRIVER AVAILABILITY
  // =========================

  const driverAvailability = {
    available: 0,
    busy: 0,
    offline: 0,
  };

  for (const { availability, _count } of driverAvailabilityCounts) {
    driverAvailability[availability.toLowerCase()] = _count.availability;
  }

  driverStats.availability = driverAvailability;

  const driverActivity = {
    labels: ["AVAILABLE", "BUSY", "OFFLINE"],
    datasets: [
      {
        label: "Drivers",
        data: [
          driverAvailability.available,
          driverAvailability.busy,
          driverAvailability.offline,
        ],
      },
    ],
  };

  // =========================
  // RIDE STATUS
  // =========================

  const rideStats = {
    total: 0,
    requested: 0,
    accepted: 0,
    arrived: 0,
    started: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const { status, _count } of rideStatusCounts) {
    const count = _count.status;

    rideStats[status.toLowerCase()] = count;
    rideStats.total += count;
  }

  // =========================
  // PAYMENT STATUS
  // =========================

  const paymentStats = {
    total: 0,
    pending: 0,
    processing: 0,
    successful: 0,
    failed: 0,
    refunded: 0,
  };

  for (const { status, _count } of paymentStatusCounts) {
    const count = _count.status;

    const key = status.toLowerCase();

    if (key === "success") {
      paymentStats.successful = count;
    } else {
      paymentStats[key] = count;
    }

    paymentStats.total += count;
  }

  // =========================
  // REVENUE
  // =========================

  const rideGraph = {
    labels: rideGraphResult.map((item) => item.date),
    datasets: [
      {
        label: "Rides",
        data: rideGraphResult.map((item) => item.rides),
      },
    ],
  };

  const userRegistrationGraph = {
    labels: userRegistrationGraphResult.map((item) => item.date),
    datasets: [
      {
        label: "User Registrations",
        data: userRegistrationGraphResult.map((item) => item.registrations),
      },
    ],
  };

  const revenueGraph = {
    labels: revenueGraphResult.map((item) => item.date),
    datasets: [
      {
        label: "Revenue",
        data: revenueGraphResult.map((item) => item.revenue.toString()),
      },
    ],
  };

  const totalRevenue = (revenueResult._sum.amount || 0).toString();

  const todayRevenue = (todayRevenueResult._sum.amount || 0).toString();

  // =========================
  // RECENT DATA
  // =========================

  const formattedRecentRides = recentRides.map((ride) => ({
    id: ride.id,
    status: ride.status,
    createdAt: ride.createdAt,
  }));

  const formattedRecentPayments = recentPayments.map((payment) => ({
    id: payment.id,
    amount: payment.amount.toString(),
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  }));

  // =========================
  // FINAL RESPONSE
  // =========================

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      verified: verifiedUsers,
      registrationGraph: userRegistrationGraph,
    },

    drivers: {
      ...driverStats,
      activity: driverActivity,
    },

    rides: {
      ...rideStats,
      graph: rideGraph,
    },

    payments: paymentStats,

    revenue: {
      totalRevenue,
      todayRevenue,
      graph: revenueGraph,
    },

    today: {
      rides: todayRides,
      completedRides: todayCompletedRides,
      cancelledRides: todayCancelledRides,
      revenue: todayRevenue,
    },

    recentRides: formattedRecentRides,

    recentPayments: formattedRecentPayments,
  };
};

module.exports = {
  getDashboardData,
};
