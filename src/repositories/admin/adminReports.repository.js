const { Prisma } = require("@prisma/client");
const prisma = require("../../config/prisma");

/**
 * Helper to build Date filter object for Prisma.
 */
const buildDateFilter = (fromDate, toDate, dateField = "createdAt") => {
  if (!fromDate && !toDate) return {};

  const filter = {};
  if (fromDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    filter.gte = start;
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }

  return { [dateField]: filter };
};

/* =====================================================
   1. OVERVIEW REPORT REPOSITORY
===================================================== */

const getOverviewMetrics = async ({ fromDate, toDate } = {}) => {
  const paymentDateFilter = buildDateFilter(fromDate, toDate, "paidAt");
  const rideDateFilter = buildDateFilter(fromDate, toDate, "createdAt");
  const userDateFilter = buildDateFilter(fromDate, toDate, "createdAt");
  const couponDateFilter = buildDateFilter(fromDate, toDate, "usedAt");

  const [
    revenueSummary,
    totalRides,
    completedRides,
    cancelledRides,
    activeRides,
    totalUsers,
    activeUsers,
    verifiedUsers,
    blockedUsers,
    totalDrivers,
    approvedDrivers,
    availableDrivers,
    totalVehicles,
    approvedVehicles,
    totalPayments,
    successfulPayments,
    failedPayments,
    totalCouponUsages,
    couponDiscountSummary,
  ] = await Promise.all([
    // Revenue
    prisma.payment.aggregate({
      where: {
        status: "SUCCESS",
        paidAt: { not: null },
        ...paymentDateFilter,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Rides
    prisma.ride.count({ where: rideDateFilter }),
    prisma.ride.count({ where: { status: "COMPLETED", ...rideDateFilter } }),
    prisma.ride.count({ where: { status: "CANCELLED", ...rideDateFilter } }),
    prisma.ride.count({
      where: {
        status: { in: ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED"] },
      },
    }),

    // Users
    prisma.user.count({ where: { role: "USER", ...userDateFilter } }),
    prisma.user.count({ where: { role: "USER", isActive: true } }),
    prisma.user.count({ where: { role: "USER", isVerified: true } }),
    prisma.user.count({ where: { role: "USER", isBlocked: true } }),

    // Drivers
    prisma.driver.count(),
    prisma.driver.count({ where: { status: "APPROVED" } }),
    prisma.driver.count({ where: { availability: "AVAILABLE" } }),

    // Vehicles
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "APPROVED" } }),

    // Payments
    prisma.payment.count({ where: buildDateFilter(fromDate, toDate, "createdAt") }),
    prisma.payment.count({
      where: { status: "SUCCESS", ...buildDateFilter(fromDate, toDate, "createdAt") },
    }),
    prisma.payment.count({
      where: { status: "FAILED", ...buildDateFilter(fromDate, toDate, "createdAt") },
    }),

    // Coupons
    prisma.couponUsage.count({ where: couponDateFilter }),
    prisma.couponUsage.aggregate({
      where: couponDateFilter,
      _sum: { discountAmount: true },
    }),
  ]);

  return {
    revenueSummary,
    totalRides,
    completedRides,
    cancelledRides,
    activeRides,
    totalUsers,
    activeUsers,
    verifiedUsers,
    blockedUsers,
    totalDrivers,
    approvedDrivers,
    availableDrivers,
    totalVehicles,
    approvedVehicles,
    totalPayments,
    successfulPayments,
    failedPayments,
    totalCouponUsages,
    couponDiscountSummary,
  };
};

/* =====================================================
   2. REVENUE REPORT REPOSITORY
===================================================== */

const getRevenueReportData = async ({
  fromDate,
  toDate,
  vehicleType,
  city,
  interval = "daily",
}) => {
  const where = {
    status: "SUCCESS",
    paidAt: { not: null },
  };

  if (fromDate || toDate) {
    where.paidAt = {};
    if (fromDate) {
      const s = new Date(fromDate);
      s.setHours(0, 0, 0, 0);
      where.paidAt.gte = s;
    }
    if (toDate) {
      const e = new Date(toDate);
      e.setHours(23, 59, 59, 999);
      where.paidAt.lte = e;
    }
  }

  if (vehicleType) {
    where.ride = { vehicleType };
  }

  if (city) {
    where.ride = {
      ...(where.ride || {}),
      pickup: { contains: city, mode: "insensitive" },
    };
  }

  // Summary aggregation
  const summary = await prisma.payment.aggregate({
    where,
    _count: { id: true },
    _sum: { amount: true },
    _avg: { amount: true },
    _min: { amount: true },
    _max: { amount: true },
  });

  // Revenue by Vehicle Type
  const revenueByVehicleType = await prisma.$queryRaw`
    SELECT
      r."vehicleType" AS "vehicleType",
      COUNT(p.id)::int AS "count",
      COALESCE(SUM(p.amount), 0)::numeric(12,2) AS "revenue"
    FROM "Payment" p
    INNER JOIN "Ride" r ON r.id = p."rideId"
    WHERE p.status = 'SUCCESS'
      AND p."paidAt" IS NOT NULL
      ${fromDate ? Prisma.sql`AND p."paidAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND p."paidAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY r."vehicleType"
    ORDER BY "revenue" DESC;
  `;

  // Revenue by City
  const revenueByCity = await prisma.$queryRaw`
    SELECT
      COALESCE(
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 2)), ''),
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 1)), ''),
        'UNKNOWN'
      ) AS "city",
      COUNT(p.id)::int AS "count",
      COALESCE(SUM(p.amount), 0)::numeric(12,2) AS "revenue"
    FROM "Payment" p
    INNER JOIN "Ride" r ON r.id = p."rideId"
    WHERE p.status = 'SUCCESS'
      AND p."paidAt" IS NOT NULL
      ${fromDate ? Prisma.sql`AND p."paidAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND p."paidAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY "city"
    ORDER BY "revenue" DESC
    LIMIT 20;
  `;

  // Revenue Trend Series
  let truncField = "day";
  if (interval === "weekly") truncField = "week";
  if (interval === "monthly") truncField = "month";
  const truncSql = Prisma.raw(`'${truncField}'`);

  const revenueTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc(${truncSql}, p."paidAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(p.id)::int AS "count",
      COALESCE(SUM(p.amount), 0)::numeric(12,2) AS "revenue"
    FROM "Payment" p
    INNER JOIN "Ride" r ON r.id = p."rideId"
    WHERE p.status = 'SUCCESS'
      AND p."paidAt" IS NOT NULL
      ${fromDate ? Prisma.sql`AND p."paidAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND p."paidAt" <= ${new Date(toDate)}` : Prisma.empty}
      ${vehicleType ? Prisma.sql`AND r."vehicleType" = ${vehicleType}::"VehicleType"` : Prisma.empty}
      ${city ? Prisma.sql`AND r.pickup ILIKE ${'%' + city + '%'}` : Prisma.empty}
    GROUP BY date_trunc(${truncSql}, p."paidAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc(${truncSql}, p."paidAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  return {
    summary,
    revenueByVehicleType,
    revenueByCity,
    revenueTrend,
  };
};

/* =====================================================
   3. RIDE REPORT REPOSITORY
===================================================== */

const getRideReportData = async ({ fromDate, toDate, status, vehicleType }) => {
  const where = {};

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      const s = new Date(fromDate);
      s.setHours(0, 0, 0, 0);
      where.createdAt.gte = s;
    }
    if (toDate) {
      const e = new Date(toDate);
      e.setHours(23, 59, 59, 999);
      where.createdAt.lte = e;
    }
  }

  if (status) {
    where.status = status;
  }

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }

  const [
    totalRides,
    statusBreakdown,
    vehicleTypeBreakdown,
    distanceDurationStats,
    fareStats,
  ] = await Promise.all([
    prisma.ride.count({ where }),
    prisma.ride.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    }),
    prisma.ride.groupBy({
      by: ["vehicleType"],
      where,
      _count: { vehicleType: true },
    }),
    prisma.ride.aggregate({
      where,
      _avg: {
        distance: true,
        duration: true,
      },
      _max: {
        distance: true,
        duration: true,
      },
      _min: {
        distance: true,
        duration: true,
      },
    }),
    prisma.ride.aggregate({
      where: {
        ...where,
        finalFare: { not: null },
      },
      _sum: { finalFare: true, discountAmount: true },
      _avg: { finalFare: true },
    }),
  ]);

  // Ride Trend Series
  const rideTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('day', r."createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(*)::int AS "totalRides",
      COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS "completedRides",
      COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::int AS "cancelledRides"
    FROM "Ride" r
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND r."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND r."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
      ${vehicleType ? Prisma.sql`AND r."vehicleType" = ${vehicleType}::"VehicleType"` : Prisma.empty}
      ${status ? Prisma.sql`AND r.status = ${status}::"RideStatus"` : Prisma.empty}
    GROUP BY date_trunc('day', r."createdAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('day', r."createdAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  return {
    totalRides,
    statusBreakdown,
    vehicleTypeBreakdown,
    distanceDurationStats,
    fareStats,
    rideTrend,
  };
};

/* =====================================================
   4. USER REPORT REPOSITORY
===================================================== */

const getUserReportData = async ({ fromDate, toDate }) => {
  const whereRole = { role: "USER" };
  const dateFilter = buildDateFilter(fromDate, toDate, "createdAt");

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    verifiedUsers,
    unverifiedUsers,
    blockedUsers,
    newRegistrationsInPeriod,
    genderBreakdown,
  ] = await Promise.all([
    prisma.user.count({ where: whereRole }),
    prisma.user.count({ where: { ...whereRole, isActive: true } }),
    prisma.user.count({ where: { ...whereRole, isActive: false } }),
    prisma.user.count({ where: { ...whereRole, isVerified: true } }),
    prisma.user.count({ where: { ...whereRole, isVerified: false } }),
    prisma.user.count({ where: { ...whereRole, isBlocked: true } }),
    prisma.user.count({ where: { ...whereRole, ...dateFilter } }),
    prisma.user.groupBy({
      by: ["gender"],
      where: whereRole,
      _count: { gender: true },
    }),
  ]);

  // User Registration Trend
  const registrationTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('day', u."createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(*)::int AS "registrations"
    FROM "User" u
    WHERE u.role = 'USER'
      ${fromDate ? Prisma.sql`AND u."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND u."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY date_trunc('day', u."createdAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('day', u."createdAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    verifiedUsers,
    unverifiedUsers,
    blockedUsers,
    newRegistrationsInPeriod,
    genderBreakdown,
    registrationTrend,
  };
};

/* =====================================================
   5. DRIVER REPORT REPOSITORY
===================================================== */

const getDriverReportData = async ({ fromDate, toDate, status, availability }) => {
  const where = {};
  if (status) where.status = status;
  if (availability) where.availability = availability;

  const [
    totalDrivers,
    statusBreakdown,
    availabilityBreakdown,
    ratingStats,
    experienceStats,
  ] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.driver.groupBy({
      by: ["availability"],
      _count: { availability: true },
    }),
    prisma.driver.aggregate({
      _avg: { averageRating: true },
      _count: { id: true },
    }),
    prisma.driver.aggregate({
      _avg: { experience: true },
      _max: { experience: true },
      _min: { experience: true },
    }),
  ]);

  // Rating breakdown buckets (1-5 stars from reviews)
  const ratingDistribution = await prisma.$queryRaw`
    SELECT
      rating,
      COUNT(*)::int AS count
    FROM "RideReview"
    GROUP BY rating
    ORDER BY rating DESC;
  `;

  // Driver Registration Trend
  const registrationTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('day', d."createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(*)::int AS "registrations"
    FROM "Driver" d
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND d."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND d."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
      ${status ? Prisma.sql`AND d.status = ${status}::"DriverStatus"` : Prisma.empty}
      ${availability ? Prisma.sql`AND d.availability = ${availability}::"DriverAvailability"` : Prisma.empty}
    GROUP BY date_trunc('day', d."createdAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('day', d."createdAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  // Top Rated Drivers
  const topDrivers = await prisma.driver.findMany({
    where: {
      status: "APPROVED",
      totalRatings: { gt: 0 },
    },
    orderBy: [{ averageRating: "desc" }, { totalRatings: "desc" }],
    take: 10,
    select: {
      id: true,
      licenseNumber: true,
      averageRating: true,
      totalRatings: true,
      experience: true,
      availability: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return {
    totalDrivers,
    statusBreakdown,
    availabilityBreakdown,
    ratingStats,
    experienceStats,
    ratingDistribution,
    registrationTrend,
    topDrivers,
  };
};

/* =====================================================
   6. VEHICLE REPORT REPOSITORY
===================================================== */

const getVehicleReportData = async ({ status, vehicleType, category } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (vehicleType) where.vehicleType = vehicleType;
  if (category) where.category = category;

  const [
    totalVehicles,
    typeBreakdown,
    categoryBreakdown,
    statusBreakdown,
    ridesByVehicleType,
  ] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.groupBy({
      by: ["vehicleType"],
      where,
      _count: { vehicleType: true },
    }),
    prisma.vehicle.groupBy({
      by: ["category"],
      where,
      _count: { category: true },
    }),
    prisma.vehicle.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    }),
    prisma.ride.groupBy({
      by: ["vehicleType"],
      _count: { vehicleType: true },
    }),
  ]);

  return {
    totalVehicles,
    typeBreakdown,
    categoryBreakdown,
    statusBreakdown,
    ridesByVehicleType,
  };
};

/* =====================================================
   7. PAYMENT REPORT REPOSITORY
===================================================== */

const getPaymentReportData = async ({
  fromDate,
  toDate,
  status,
  paymentMethod,
}) => {
  const where = {};

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      const s = new Date(fromDate);
      s.setHours(0, 0, 0, 0);
      where.createdAt.gte = s;
    }
    if (toDate) {
      const e = new Date(toDate);
      e.setHours(23, 59, 59, 999);
      where.createdAt.lte = e;
    }
  }

  if (status) where.status = status;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  const [
    totalCount,
    overallVolume,
    statusBreakdown,
    methodBreakdown,
    gatewayBreakdown,
  ] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["paymentMethod"],
      where,
      _count: { paymentMethod: true },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["gateway"],
      where,
      _count: { gateway: true },
      _sum: { amount: true },
    }),
  ]);

  // Payment Volume & Count Trend Series
  const paymentTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('day', p."createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(p.id)::int AS "totalTransactions",
      COALESCE(SUM(p.amount), 0)::numeric(12,2) AS "totalAmount",
      COUNT(p.id) FILTER (WHERE p.status = 'SUCCESS')::int AS "successfulTransactions",
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'SUCCESS'), 0)::numeric(12,2) AS "successfulAmount"
    FROM "Payment" p
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND p."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND p."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
      ${status ? Prisma.sql`AND p.status = ${status}::"PaymentStatus"` : Prisma.empty}
      ${paymentMethod ? Prisma.sql`AND p."paymentMethod" = ${paymentMethod}::"PaymentMethod"` : Prisma.empty}
    GROUP BY date_trunc('day', p."createdAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('day', p."createdAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  return {
    totalCount,
    overallVolume,
    statusBreakdown,
    methodBreakdown,
    gatewayBreakdown,
    paymentTrend,
  };
};

/* =====================================================
   8. COUPON REPORT REPOSITORY
===================================================== */

const getCouponReportData = async ({ fromDate, toDate }) => {
  const usageWhere = {};
  if (fromDate || toDate) {
    usageWhere.usedAt = {};
    if (fromDate) {
      const s = new Date(fromDate);
      s.setHours(0, 0, 0, 0);
      usageWhere.usedAt.gte = s;
    }
    if (toDate) {
      const e = new Date(toDate);
      e.setHours(23, 59, 59, 999);
      usageWhere.usedAt.lte = e;
    }
  }

  const now = new Date();

  const [
    totalCoupons,
    activeCoupons,
    inactiveCoupons,
    expiredCoupons,
    totalUsages,
    discountSummary,
    topCouponGroups,
  ] = await Promise.all([
    prisma.coupon.count(),
    prisma.coupon.count({ where: { isActive: true } }),
    prisma.coupon.count({ where: { isActive: false } }),
    prisma.coupon.count({ where: { validUntil: { lt: now } } }),
    prisma.couponUsage.count({ where: usageWhere }),
    prisma.couponUsage.aggregate({
      where: usageWhere,
      _sum: { discountAmount: true },
      _avg: { discountAmount: true },
    }),
    prisma.couponUsage.groupBy({
      by: ["couponId"],
      where: usageWhere,
      _count: { couponId: true },
      _sum: { discountAmount: true },
      orderBy: {
        _count: {
          couponId: "desc",
        },
      },
      take: 10,
    }),
  ]);

  // Retrieve coupon details for top performers
  const couponIds = topCouponGroups.map((g) => g.couponId);
  const couponDetails =
    couponIds.length > 0
      ? await prisma.coupon.findMany({
          where: { id: { in: couponIds } },
          select: {
            id: true,
            code: true,
            type: true,
            discountValue: true,
            usageLimit: true,
            usedCount: true,
            isActive: true,
            validFrom: true,
            validUntil: true,
          },
        })
      : [];

  const couponMap = new Map(couponDetails.map((c) => [c.id, c]));
  const topCoupons = topCouponGroups.map((group) => {
    const coupon = couponMap.get(group.couponId);
    return {
      couponId: group.couponId,
      code: coupon?.code || "N/A",
      type: coupon?.type || "FLAT",
      discountValue: coupon?.discountValue?.toString() || "0",
      usageLimit: coupon?.usageLimit ?? null,
      usedCount: coupon?.usedCount ?? group._count.couponId,
      isActive: coupon?.isActive ?? true,
      validFrom: coupon?.validFrom || null,
      validUntil: coupon?.validUntil || null,
      periodUsages: group._count.couponId,
      periodDiscountAmount: (group._sum.discountAmount || 0).toString(),
    };
  });

  // Coupon Usage Trend Series
  const usageTrend = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc('day', cu."usedAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "date",
      COUNT(cu.id)::int AS "usages",
      COALESCE(SUM(cu."discountAmount"), 0)::numeric(12,2) AS "discountAmount"
    FROM "CouponUsage" cu
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND cu."usedAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND cu."usedAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY date_trunc('day', cu."usedAt" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('day', cu."usedAt" AT TIME ZONE 'Asia/Kolkata') ASC;
  `;

  return {
    totalCoupons,
    activeCoupons,
    inactiveCoupons,
    expiredCoupons,
    totalUsages,
    discountSummary,
    topCoupons,
    usageTrend,
  };
};

/* =====================================================
   9. OPERATIONS REPORT REPOSITORY
===================================================== */

const getOperationsReportData = async ({ fromDate, toDate } = {}) => {
  // Peak Hours Graph (0 to 23 hours distribution)
  const peakHours = await prisma.$queryRaw`
    WITH hours AS (
      SELECT generate_series(0, 23) AS hour
    ),
    ride_counts AS (
      SELECT
        EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Kolkata'))::int AS hour,
        COUNT(*)::int AS rides
      FROM "Ride"
      WHERE 1=1
        ${fromDate ? Prisma.sql`AND "createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
        ${toDate ? Prisma.sql`AND "createdAt" <= ${new Date(toDate)}` : Prisma.empty}
      GROUP BY EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE 'Asia/Kolkata'))
    )
    SELECT
      hours.hour,
      COALESCE(ride_counts.rides, 0)::int AS rides
    FROM hours
    LEFT JOIN ride_counts ON ride_counts.hour = hours.hour
    ORDER BY hours.hour ASC;
  `;

  // City Performance (Rides count, Completed rides, Revenue)
  const cityPerformance = await prisma.$queryRaw`
    SELECT
      COALESCE(
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 2)), ''),
        NULLIF(TRIM(SPLIT_PART(r.pickup, ',', 1)), ''),
        'UNKNOWN'
      ) AS "city",
      COUNT(r.id)::int AS "totalRides",
      COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED')::int AS "completedRides",
      COUNT(r.id) FILTER (WHERE r.status = 'CANCELLED')::int AS "cancelledRides",
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'SUCCESS'), 0)::numeric(12,2) AS "revenue"
    FROM "Ride" r
    LEFT JOIN "Payment" p ON p."rideId" = r.id
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND r."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND r."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY "city"
    ORDER BY "totalRides" DESC
    LIMIT 20;
  `;

  // Vehicle Type Performance
  const vehiclePerformance = await prisma.$queryRaw`
    SELECT
      r."vehicleType" AS "vehicleType",
      COUNT(r.id)::int AS "totalRides",
      COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED')::int AS "completedRides",
      COUNT(r.id) FILTER (WHERE r.status = 'CANCELLED')::int AS "cancelledRides",
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'SUCCESS'), 0)::numeric(12,2) AS "revenue"
    FROM "Ride" r
    LEFT JOIN "Payment" p ON p."rideId" = r.id
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND r."createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND r."createdAt" <= ${new Date(toDate)}` : Prisma.empty}
    GROUP BY r."vehicleType"
    ORDER BY "totalRides" DESC;
  `;

  // Cancellation Stats
  const cancellationStats = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "totalRides",
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS "cancelledRides",
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS "completedRides"
    FROM "Ride"
    WHERE 1=1
      ${fromDate ? Prisma.sql`AND "createdAt" >= ${new Date(fromDate)}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND "createdAt" <= ${new Date(toDate)}` : Prisma.empty};
  `;

  return {
    peakHours,
    cityPerformance,
    vehiclePerformance,
    cancellationStats: cancellationStats[0] || { totalRides: 0, cancelledRides: 0, completedRides: 0 },
  };
};

module.exports = {
  getOverviewMetrics,
  getRevenueReportData,
  getRideReportData,
  getUserReportData,
  getDriverReportData,
  getVehicleReportData,
  getPaymentReportData,
  getCouponReportData,
  getOperationsReportData,
};
