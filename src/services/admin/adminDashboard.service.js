const dashboardRepository = require("../../repositories/admin/adminDashboard.repository");

const getDashboardData = async () => {
  // Batch 1: Core counts (Users, Drivers, Vehicles)
  const [
    [totalUsers, activeUsers, inactiveUsers, verifiedUsers],
    driverStatusCounts,
    driverAvailabilityCounts,
    totalVehicles,
  ] = await Promise.all([
    dashboardRepository.getUserStats(),
    dashboardRepository.getDriverStats(),
    dashboardRepository.getDriverAvailabilityStats(),
    dashboardRepository.getVehicleStats(),
  ]);

  // Batch 2: Ride & Payment Statuses and Revenues
  const [
    rideStatusCounts,
    paymentStatusCounts,
    revenueResult,
    revenuePeriodResult,
  ] = await Promise.all([
    dashboardRepository.getRideStats(),
    dashboardRepository.getPaymentStats(),
    dashboardRepository.getRevenueStats(),
    dashboardRepository.getRevenuePeriodStats(),
  ]);

  // Batch 3: Today & Realtime Counts
  const [
    [todayRides, todayCompletedRides, todayCancelledRides, todayRevenueResult],
    activeRides,
    couponsUsed,
    notificationsSent,
    cancellationRate,
  ] = await Promise.all([
    dashboardRepository.getTodayStats(),
    dashboardRepository.getActiveRideCount(),
    dashboardRepository.getCouponUsageCount(),
    dashboardRepository.getNotificationStats(),
    dashboardRepository.getCancellationRate(),
  ]);

  // Batch 4: Recent Activities
  const [
    recentRides,
    recentPayments,
  ] = await Promise.all([
    dashboardRepository.getRecentRides(),
    dashboardRepository.getRecentPayments(),
  ]);

  // Batch 5: Trend Graphs
  const [
    revenueGraphResult,
    rideGraphResult,
    userRegistrationGraphResult,
  ] = await Promise.all([
    dashboardRepository.getRevenueGraph(),
    dashboardRepository.getRideGraph(),
    dashboardRepository.getUserRegistrationGraph(),
  ]);

  // Batch 6: Advanced Breakdowns
  const [
    peakHoursResult,
    cityWiseRevenueResult,
    vehicleWiseRevenueResult,
  ] = await Promise.all([
    dashboardRepository.getPeakHoursGraph(),
    dashboardRepository.getCityWiseRevenueGraph(),
    dashboardRepository.getVehicleWiseRevenueGraph(),
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
  // GRAPHS
  // =========================

  const rideGraph = {
    labels: rideGraphResult.map((item) => item.date.toISOString().slice(0, 10)),
    datasets: [
      {
        label: "Rides",
        data: rideGraphResult.map((item) => Number(item.rides)),
      },
    ],
  };

  const userRegistrationGraph = {
    labels: userRegistrationGraphResult.map((item) =>
      item.date.toISOString().slice(0, 10),
    ),
    datasets: [
      {
        label: "User Registrations",
        data: userRegistrationGraphResult.map((item) =>
          Number(item.registrations),
        ),
      },
    ],
  };

  const revenueGraph = {
    labels: revenueGraphResult.map((item) =>
      item.date.toISOString().slice(0, 10),
    ),
    datasets: [
      {
        label: "Revenue",
        data: revenueGraphResult.map((item) => item.revenue.toString()),
      },
    ],
  };

  const peakHoursGraph = {
    labels: peakHoursResult.map(
      (item) => `${String(item.hour).padStart(2, "0")}:00`,
    ),
    datasets: [
      {
        label: "Rides",
        data: peakHoursResult.map((item) => Number(item.rides)),
      },
    ],
  };

  const cityWiseRevenueGraph = {
    labels: cityWiseRevenueResult.map((item) => item.city),
    datasets: [
      {
        label: "Revenue",
        data: cityWiseRevenueResult.map((item) => item.revenue.toString()),
      },
    ],
  };

  const vehicleWiseRevenueGraph = {
    labels: vehicleWiseRevenueResult.map((item) => item.vehicleType),
    datasets: [
      {
        label: "Revenue",
        data: vehicleWiseRevenueResult.map((item) => item.revenue.toString()),
      },
    ],
  };

  // =========================
  // REVENUE
  // =========================

  const totalRevenue = (revenueResult._sum.amount || 0).toString();

  const todayRevenue = (todayRevenueResult._sum.amount || 0).toString();

  const periodRevenue = revenuePeriodResult[0] || {};

  const dailyRevenue = Number(periodRevenue.daily_revenue || 0).toString();

  const weeklyRevenue = Number(periodRevenue.weekly_revenue || 0).toString();

  const monthlyRevenue = Number(periodRevenue.monthly_revenue || 0).toString();

  // =========================
  // RECENT DATA
  // =========================

  const formattedRecentRides = recentRides.map((ride) => ({
    id: ride.id,
    pickup: ride.pickup,
    destination: ride.destination,
    status: ride.status,
    vehicleType: ride.vehicleType,
    estimatedFare: ride.estimatedFare?.toString() ?? null,
    finalFare: ride.finalFare?.toString() ?? null,
    createdAt: ride.createdAt,
    user: ride.user,
    driver: ride.driver
      ? {
          id: ride.driver.id,
          fullName: ride.driver.user.fullName,
        }
      : null,
  }));

  const formattedRecentPayments = recentPayments.map((payment) => ({
    id: payment.id,
    amount: payment.amount.toString(),
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    user: payment.user,
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
      active: driverStats.approved,
      online: driverAvailability.available,
      availability: driverAvailability,
      activity: driverActivity,
    },

    vehicles: {
      total: totalVehicles,
    },

    rides: {
      ...rideStats,
      active: activeRides,
      graph: rideGraph,
    },

    payments: paymentStats,

    revenue: {
      totalRevenue,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      todayRevenue,
      graph: revenueGraph,
    },

    coupons: {
      used: couponsUsed,
    },

    notifications: {
      sent: notificationsSent,
    },

    analytics: {
      peakHours: peakHoursGraph,
      cityWiseRevenue: cityWiseRevenueGraph,
      vehicleWiseRevenue: vehicleWiseRevenueGraph,
      cancellationRate: cancellationRate.rate,
      cancellation: cancellationRate,
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
