const adminReportsRepository = require("../../repositories/admin/adminReports.repository");

/**
 * Format decimal/number safely to 2-decimal string or "0".
 */
const formatAmount = (val) => {
  if (val === null || val === undefined) return "0.00";
  const num = Number(val);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

/**
 * Safe percentage calculation.
 */
const calculateRate = (part, total) => {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (t <= 0) return 0;
  return Number(((p / t) * 100).toFixed(2));
};

/* =====================================================
   1. OVERVIEW REPORT SERVICE
===================================================== */

const getOverviewReport = async (filters = {}) => {
  const metrics = await adminReportsRepository.getOverviewMetrics(filters);

  const totalRev = Number(metrics.revenueSummary._sum.amount || 0);
  const totalRides = Number(metrics.totalRides || 0);
  const completedRides = Number(metrics.completedRides || 0);
  const cancelledRides = Number(metrics.cancelledRides || 0);
  const totalPayments = Number(metrics.totalPayments || 0);
  const successfulPayments = Number(metrics.successfulPayments || 0);

  return {
    revenue: {
      totalRevenue: formatAmount(totalRev),
      transactionCount: metrics.revenueSummary._count.id || 0,
      averageTransaction: formatAmount(
        metrics.revenueSummary._count.id
          ? totalRev / metrics.revenueSummary._count.id
          : 0,
      ),
    },
    rides: {
      total: totalRides,
      completed: completedRides,
      cancelled: cancelledRides,
      active: metrics.activeRides || 0,
      cancellationRate: calculateRate(cancelledRides, totalRides),
      completionRate: calculateRate(completedRides, totalRides),
    },
    users: {
      total: metrics.totalUsers || 0,
      active: metrics.activeUsers || 0,
      verified: metrics.verifiedUsers || 0,
      blocked: metrics.blockedUsers || 0,
    },
    drivers: {
      total: metrics.totalDrivers || 0,
      approved: metrics.approvedDrivers || 0,
      available: metrics.availableDrivers || 0,
    },
    vehicles: {
      total: metrics.totalVehicles || 0,
      approved: metrics.approvedVehicles || 0,
    },
    payments: {
      total: totalPayments,
      successful: successfulPayments,
      failed: metrics.failedPayments || 0,
      successRate: calculateRate(successfulPayments, totalPayments),
    },
    coupons: {
      totalUsages: metrics.totalCouponUsages || 0,
      totalDiscountAmount: formatAmount(
        metrics.couponDiscountSummary._sum.discountAmount,
      ),
    },
  };
};

/* =====================================================
   2. REVENUE REPORT SERVICE
===================================================== */

const getRevenueReport = async (filters = {}) => {
  const data = await adminReportsRepository.getRevenueReportData(filters);

  const totalRevenue = Number(data.summary._sum.amount || 0);
  const transactionCount = Number(data.summary._count.id || 0);
  const avgRevenue = Number(data.summary._avg.amount || 0);
  const minRevenue = Number(data.summary._min.amount || 0);
  const maxRevenue = Number(data.summary._max.amount || 0);

  const vehicleTypeBreakdown = data.revenueByVehicleType.map((item) => ({
    vehicleType: item.vehicleType,
    count: Number(item.count),
    revenue: formatAmount(item.revenue),
    sharePercentage: calculateRate(item.revenue, totalRevenue),
  }));

  const cityBreakdown = data.revenueByCity.map((item) => ({
    city: item.city,
    count: Number(item.count),
    revenue: formatAmount(item.revenue),
    sharePercentage: calculateRate(item.revenue, totalRevenue),
  }));

  const trend = {
    labels: data.revenueTrend.map((item) => item.date),
    datasets: [
      {
        label: "Revenue",
        data: data.revenueTrend.map((item) => Number(item.revenue)),
      },
      {
        label: "Transactions",
        data: data.revenueTrend.map((item) => Number(item.count)),
      },
    ],
  };

  return {
    summary: {
      totalRevenue: formatAmount(totalRevenue),
      transactionCount,
      averageRevenue: formatAmount(avgRevenue),
      minRevenue: formatAmount(minRevenue),
      maxRevenue: formatAmount(maxRevenue),
    },
    vehicleTypeBreakdown,
    cityBreakdown,
    trend,
  };
};

/* =====================================================
   3. RIDE REPORT SERVICE
===================================================== */

const getRideReport = async (filters = {}) => {
  const data = await adminReportsRepository.getRideReportData(filters);

  const statusMap = {};
  data.statusBreakdown.forEach((s) => {
    statusMap[s.status] = s._count.status;
  });

  const totalRides = data.totalRides || 0;
  const completedRides = statusMap["COMPLETED"] || 0;
  const cancelledRides = statusMap["CANCELLED"] || 0;
  const requestedRides = statusMap["REQUESTED"] || 0;
  const acceptedRides = statusMap["ACCEPTED"] || 0;
  const arrivedRides = statusMap["ARRIVED"] || 0;
  const startedRides = statusMap["STARTED"] || 0;

  const vehicleTypeBreakdown = data.vehicleTypeBreakdown.map((item) => ({
    vehicleType: item.vehicleType,
    count: item._count.vehicleType,
    sharePercentage: calculateRate(item._count.vehicleType, totalRides),
  }));

  const trend = {
    labels: data.rideTrend.map((item) => item.date),
    datasets: [
      {
        label: "Total Rides",
        data: data.rideTrend.map((item) => Number(item.totalRides)),
      },
      {
        label: "Completed",
        data: data.rideTrend.map((item) => Number(item.completedRides)),
      },
      {
        label: "Cancelled",
        data: data.rideTrend.map((item) => Number(item.cancelledRides)),
      },
    ],
  };

  return {
    summary: {
      totalRides,
      completedRides,
      cancelledRides,
      requestedRides,
      acceptedRides,
      arrivedRides,
      startedRides,
      activeRides: requestedRides + acceptedRides + arrivedRides + startedRides,
      cancellationRate: calculateRate(cancelledRides, totalRides),
      completionRate: calculateRate(completedRides, totalRides),
    },
    statusBreakdown: {
      REQUESTED: requestedRides,
      ACCEPTED: acceptedRides,
      ARRIVED: arrivedRides,
      STARTED: startedRides,
      COMPLETED: completedRides,
      CANCELLED: cancelledRides,
    },
    vehicleTypeBreakdown,
    metrics: {
      avgDistanceKm: Number((data.distanceDurationStats._avg.distance || 0).toFixed(2)),
      maxDistanceKm: Number((data.distanceDurationStats._max.distance || 0).toFixed(2)),
      avgDurationMinutes: Number((data.distanceDurationStats._avg.duration || 0).toFixed(2)),
      maxDurationMinutes: Number((data.distanceDurationStats._max.duration || 0).toFixed(2)),
      totalFareAmount: formatAmount(data.fareStats._sum.finalFare),
      avgFareAmount: formatAmount(data.fareStats._avg.finalFare),
      totalDiscountAmount: formatAmount(data.fareStats._sum.discountAmount),
    },
    trend,
  };
};

/* =====================================================
   4. USER REPORT SERVICE
===================================================== */

const getUserReport = async (filters = {}) => {
  const data = await adminReportsRepository.getUserReportData(filters);

  const totalUsers = data.totalUsers || 0;
  const activeUsers = data.activeUsers || 0;
  const verifiedUsers = data.verifiedUsers || 0;

  const genderBreakdown = {};
  data.genderBreakdown.forEach((g) => {
    genderBreakdown[g.gender || "UNSPECIFIED"] = g._count.gender;
  });

  const trend = {
    labels: data.registrationTrend.map((item) => item.date),
    datasets: [
      {
        label: "New Registrations",
        data: data.registrationTrend.map((item) => Number(item.registrations)),
      },
    ],
  };

  return {
    summary: {
      totalUsers,
      activeUsers,
      inactiveUsers: data.inactiveUsers || 0,
      verifiedUsers,
      unverifiedUsers: data.unverifiedUsers || 0,
      blockedUsers: data.blockedUsers || 0,
      newRegistrationsInPeriod: data.newRegistrationsInPeriod || 0,
      activeRate: calculateRate(activeUsers, totalUsers),
      verificationRate: calculateRate(verifiedUsers, totalUsers),
    },
    genderBreakdown,
    trend,
  };
};

/* =====================================================
   5. DRIVER REPORT SERVICE
===================================================== */

const getDriverReport = async (filters = {}) => {
  const data = await adminReportsRepository.getDriverReportData(filters);

  const statusBreakdown = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  data.statusBreakdown.forEach((s) => {
    statusBreakdown[s.status] = s._count.status;
  });

  const availabilityBreakdown = {
    OFFLINE: 0,
    AVAILABLE: 0,
    BUSY: 0,
  };
  data.availabilityBreakdown.forEach((a) => {
    availabilityBreakdown[a.availability] = a._count.availability;
  });

  const ratingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };
  data.ratingDistribution.forEach((r) => {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating] = Number(r.count);
    }
  });

  const trend = {
    labels: data.registrationTrend.map((item) => item.date),
    datasets: [
      {
        label: "Driver Registrations",
        data: data.registrationTrend.map((item) => Number(item.registrations)),
      },
    ],
  };

  const topDrivers = data.topDrivers.map((d) => ({
    id: d.id,
    fullName: d.user?.fullName || "N/A",
    email: d.user?.email || "N/A",
    phone: d.user?.phone || "N/A",
    licenseNumber: d.licenseNumber,
    averageRating: Number(d.averageRating.toFixed(2)),
    totalRatings: d.totalRatings,
    experienceYears: d.experience,
    availability: d.availability,
  }));

  return {
    summary: {
      totalDrivers: data.totalDrivers || 0,
      approvedDrivers: statusBreakdown.APPROVED,
      pendingDrivers: statusBreakdown.PENDING,
      rejectedDrivers: statusBreakdown.REJECTED,
      suspendedDrivers: statusBreakdown.SUSPENDED,
      availableDrivers: availabilityBreakdown.AVAILABLE,
      busyDrivers: availabilityBreakdown.BUSY,
      offlineDrivers: availabilityBreakdown.OFFLINE,
      avgRating: Number((data.ratingStats._avg.averageRating || 0).toFixed(2)),
      avgExperienceYears: Number((data.experienceStats._avg.experience || 0).toFixed(1)),
    },
    statusBreakdown,
    availabilityBreakdown,
    ratingDistribution,
    topDrivers,
    trend,
  };
};

/* =====================================================
   6. VEHICLE REPORT SERVICE
===================================================== */

const getVehicleReport = async (filters = {}) => {
  const data = await adminReportsRepository.getVehicleReportData(filters);

  const totalVehicles = data.totalVehicles || 0;

  const typeBreakdown = {};
  data.typeBreakdown.forEach((t) => {
    typeBreakdown[t.vehicleType] = {
      count: t._count.vehicleType,
      sharePercentage: calculateRate(t._count.vehicleType, totalVehicles),
    };
  });

  const categoryBreakdown = {};
  data.categoryBreakdown.forEach((c) => {
    categoryBreakdown[c.category] = {
      count: c._count.category,
      sharePercentage: calculateRate(c._count.category, totalVehicles),
    };
  });

  const statusBreakdown = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  data.statusBreakdown.forEach((s) => {
    statusBreakdown[s.status] = s._count.status;
  });

  const rideUtilization = {};
  let totalRides = 0;
  data.ridesByVehicleType.forEach((r) => {
    totalRides += r._count.vehicleType;
  });
  data.ridesByVehicleType.forEach((r) => {
    rideUtilization[r.vehicleType] = {
      rideCount: r._count.vehicleType,
      utilizationPercentage: calculateRate(r._count.vehicleType, totalRides),
    };
  });

  return {
    summary: {
      totalVehicles,
      approvedVehicles: statusBreakdown.APPROVED,
      pendingVehicles: statusBreakdown.PENDING,
      rejectedVehicles: statusBreakdown.REJECTED,
    },
    typeBreakdown,
    categoryBreakdown,
    statusBreakdown,
    rideUtilization,
  };
};

/* =====================================================
   7. PAYMENT REPORT SERVICE
===================================================== */

const getPaymentReport = async (filters = {}) => {
  const data = await adminReportsRepository.getPaymentReportData(filters);

  const totalCount = data.totalCount || 0;
  const totalAmount = Number(data.overallVolume._sum.amount || 0);
  const avgAmount = Number(data.overallVolume._avg.amount || 0);

  const statusBreakdown = {
    PENDING: { count: 0, amount: "0.00" },
    PROCESSING: { count: 0, amount: "0.00" },
    SUCCESS: { count: 0, amount: "0.00" },
    FAILED: { count: 0, amount: "0.00" },
    REFUNDED: { count: 0, amount: "0.00" },
  };

  data.statusBreakdown.forEach((s) => {
    statusBreakdown[s.status] = {
      count: s._count.status,
      amount: formatAmount(s._sum.amount),
    };
  });

  const methodBreakdown = {};
  data.methodBreakdown.forEach((m) => {
    methodBreakdown[m.paymentMethod] = {
      count: m._count.paymentMethod,
      amount: formatAmount(m._sum.amount),
      sharePercentage: calculateRate(m._sum.amount, totalAmount),
    };
  });

  const gatewayBreakdown = {};
  data.gatewayBreakdown.forEach((g) => {
    gatewayBreakdown[g.gateway || "MANUAL/OTHER"] = {
      count: g._count.gateway,
      amount: formatAmount(g._sum.amount),
    };
  });

  const trend = {
    labels: data.paymentTrend.map((item) => item.date),
    datasets: [
      {
        label: "Total Volume",
        data: data.paymentTrend.map((item) => Number(item.totalAmount)),
      },
      {
        label: "Successful Volume",
        data: data.paymentTrend.map((item) => Number(item.successfulAmount)),
      },
      {
        label: "Total Transactions",
        data: data.paymentTrend.map((item) => Number(item.totalTransactions)),
      },
      {
        label: "Successful Transactions",
        data: data.paymentTrend.map((item) => Number(item.successfulTransactions)),
      },
    ],
  };

  return {
    summary: {
      totalTransactions: totalCount,
      totalVolumeAmount: formatAmount(totalAmount),
      averageTransactionAmount: formatAmount(avgAmount),
      successRate: calculateRate(statusBreakdown.SUCCESS.count, totalCount),
      failureRate: calculateRate(statusBreakdown.FAILED.count, totalCount),
    },
    statusBreakdown,
    methodBreakdown,
    gatewayBreakdown,
    trend,
  };
};

/* =====================================================
   8. COUPON REPORT SERVICE
===================================================== */

const getCouponReport = async (filters = {}) => {
  const data = await adminReportsRepository.getCouponReportData(filters);

  const totalDiscount = Number(data.discountSummary._sum.discountAmount || 0);
  const totalUsages = data.totalUsages || 0;

  const trend = {
    labels: data.usageTrend.map((item) => item.date),
    datasets: [
      {
        label: "Coupon Usages",
        data: data.usageTrend.map((item) => Number(item.usages)),
      },
      {
        label: "Discount Amount",
        data: data.usageTrend.map((item) => Number(item.discountAmount)),
      },
    ],
  };

  return {
    summary: {
      totalCoupons: data.totalCoupons,
      activeCoupons: data.activeCoupons,
      inactiveCoupons: data.inactiveCoupons,
      expiredCoupons: data.expiredCoupons,
      totalUsages,
      totalDiscountAmount: formatAmount(totalDiscount),
      averageDiscountPerUsage: formatAmount(
        totalUsages > 0 ? totalDiscount / totalUsages : 0,
      ),
    },
    topPerformingCoupons: data.topCoupons,
    trend,
  };
};

/* =====================================================
   9. OPERATIONS REPORT SERVICE
===================================================== */

const getOperationsReport = async (filters = {}) => {
  const data = await adminReportsRepository.getOperationsReportData(filters);

  const peakHours = {
    labels: data.peakHours.map(
      (item) => `${String(item.hour).padStart(2, "0")}:00`,
    ),
    datasets: [
      {
        label: "Rides",
        data: data.peakHours.map((item) => Number(item.rides)),
      },
    ],
  };

  const cityPerformance = data.cityPerformance.map((city) => ({
    city: city.city,
    totalRides: Number(city.totalRides),
    completedRides: Number(city.completedRides),
    cancelledRides: Number(city.cancelledRides),
    revenue: formatAmount(city.revenue),
    cancellationRate: calculateRate(city.cancelledRides, city.totalRides),
  }));

  const vehiclePerformance = data.vehiclePerformance.map((veh) => ({
    vehicleType: veh.vehicleType,
    totalRides: Number(veh.totalRides),
    completedRides: Number(veh.completedRides),
    cancelledRides: Number(veh.cancelledRides),
    revenue: formatAmount(veh.revenue),
    cancellationRate: calculateRate(veh.cancelledRides, veh.totalRides),
  }));

  const totalRides = Number(data.cancellationStats.totalRides || 0);
  const cancelledRides = Number(data.cancellationStats.cancelledRides || 0);
  const completedRides = Number(data.cancellationStats.completedRides || 0);

  return {
    peakHours,
    cityPerformance,
    vehiclePerformance,
    cancellationAnalytics: {
      totalRides,
      completedRides,
      cancelledRides,
      cancellationRate: calculateRate(cancelledRides, totalRides),
      completionRate: calculateRate(completedRides, totalRides),
    },
  };
};

module.exports = {
  getOverviewReport,
  getRevenueReport,
  getRideReport,
  getUserReport,
  getDriverReport,
  getVehicleReport,
  getPaymentReport,
  getCouponReport,
  getOperationsReport,
};
