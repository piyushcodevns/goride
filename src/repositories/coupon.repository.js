const prisma = require("../config/prisma");
const { ConflictError } = require("../utils/AppError");

/**
 * ============================================================
 * Coupon CRUD
 * ============================================================
 */

const createCoupon = (data) => {
  return prisma.coupon.create({
    data,
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

const getCouponById = (id, db = prisma) => {
  return db.coupon.findUnique({
    where: { id },
  });
};

const getCouponByCode = (code, db = prisma) => {
  return db.coupon.findUnique({
    where: {
      code,
    },
  });
};

const getAllCoupons = async (queryParams = {}) => {
  const { page, limit, search, type, isActive } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (search && typeof search === "string" && search.trim() !== "") {
    const searchTerm = search.trim();
    where.OR = [
      { code: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (isActive !== undefined && isActive !== null && isActive !== "") {
    where.isActive =
      typeof isActive === "boolean" ? isActive : isActive === "true";
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limitNum,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    data: coupons,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

const createAuditLog = (data, db = prisma) => {
  return db.auditLog.create({
    data,
  });
};

const updateCoupon = (id, data) => {
  return prisma.coupon.update({
    where: { id },
    data,
  });
};

const deleteCoupon = (id) => {
  return prisma.coupon.delete({
    where: { id },
  });
};

/**
 * ============================================================
 * Coupon Status
 * ============================================================
 */

const activateCoupon = (id) => {
  return prisma.coupon.update({
    where: { id },
    data: {
      isActive: true,
    },
  });
};

const deactivateCoupon = (id) => {
  return prisma.coupon.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};

/**
 * ============================================================
 * Coupon Usage
 * ============================================================
 */

const getUserCouponUsageCount = (couponId, userId, db = prisma) => {
  return db.couponUsage.count({
    where: {
      couponId,
      userId,
    },
  });
};

const createCouponUsage = (data) => {
  return prisma.couponUsage.create({
    data,
  });
};

const createCouponUsageTx = (tx, data) => {
  return tx.couponUsage.create({
    data,
  });
};

const incrementCouponUsage = (couponId) => {
  return prisma.coupon.update({
    where: {
      id: couponId,
    },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });
};

const incrementCouponUsageTx = async (tx, couponId) => {
  const coupon = await tx.coupon.findUnique({
    where: {
      id: couponId,
    },
    select: {
      id: true,
      usageLimit: true,
      usedCount: true,
    },
  });

  if (!coupon) {
    throw new ConflictError("Coupon no longer exists.");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new ConflictError("Coupon usage limit has been reached.");
  }

  const result = await tx.coupon.updateMany({
    where: {
      id: couponId,
      ...(coupon.usageLimit !== null
        ? {
            usedCount: {
              lt: coupon.usageLimit,
            },
          }
        : {}),
    },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });

  if (result.count === 0) {
    throw new ConflictError("Coupon usage limit has been reached.");
  }

  return tx.coupon.findUnique({
    where: {
      id: couponId,
    },
  });
};

const updateRideCouponTx = async (
  tx,
  rideId,
  couponId,
  discountAmount,
  finalFare,
) => {
  const result = await tx.ride.updateMany({
    where: {
      id: rideId,
      couponId: null,
      status: "REQUESTED",
    },
    data: {
      couponId,
      discountAmount,
      finalFare,
    },
  });

  if (result.count === 0) {
    throw new ConflictError(
      "Coupon cannot be applied. Ride was modified or already has a coupon.",
    );
  }

  return result;
};

const decrementCouponUsage = async (couponId) => {
  const result = await prisma.coupon.updateMany({
    where: {
      id: couponId,
      usedCount: {
        gt: 0,
      },
    },
    data: {
      usedCount: {
        decrement: 1,
      },
    },
  });

  if (result.count === 0) {
    throw new ConflictError(
      "Coupon usage count cannot be decremented below zero.",
    );
  }

  return prisma.coupon.findUnique({
    where: {
      id: couponId,
    },
  });
};

const getAvailableCoupons = (currentDate = new Date(), options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;

  return prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: {
        lte: currentDate,
      },
      validUntil: {
        gte: currentDate,
      },
    },
    take,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getCouponUsageByRideId = (rideId) => {
  return prisma.couponUsage.findUnique({
    where: {
      rideId,
    },
  });
};

const getCouponUsagesByCouponId = (couponId) => {
  return prisma.couponUsage.findMany({
    where: {
      couponId,
    },
    orderBy: {
      usedAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      ride: {
        select: {
          id: true,
          status: true,
          estimatedFare: true,
          finalFare: true,
          createdAt: true,
        },
      },
    },
  });
};

/**
 * ============================================================
 * Coupon Analytics / Reports
 * ============================================================
 */

const getCouponUsageAnalytics = async (couponId) => {
  const [usageStats, uniqueUsers, coupon] = await Promise.all([
    prisma.couponUsage.aggregate({
      where: {
        couponId,
      },
      _count: {
        _all: true,
      },
      _sum: {
        discountAmount: true,
      },
      _avg: {
        discountAmount: true,
      },
    }),

    prisma.couponUsage.findMany({
      where: {
        couponId,
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),

    prisma.coupon.findUnique({
      where: {
        id: couponId,
      },
      select: {
        id: true,
        code: true,
        type: true,
        discountValue: true,
        usageLimit: true,
        perUserUsageLimit: true,
        usedCount: true,
        isActive: true,
        validFrom: true,
        validUntil: true,
      },
    }),
  ]);

  return {
    coupon,
    totalUsages: usageStats._count._all,
    uniqueUsers: uniqueUsers.length,
    totalDiscountAmount: usageStats._sum.discountAmount || 0,
    averageDiscountAmount: usageStats._avg.discountAmount || 0,
  };
};

const getExpiredCoupons = async (options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;
  const now = new Date();

  return prisma.coupon.findMany({
    where: {
      validUntil: {
        lt: now,
      },
    },
    take,
    orderBy: {
      validUntil: "desc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

const getCouponReport = async () => {
  const now = new Date();

  const [
    totalCoupons,
    activeCoupons,
    inactiveCoupons,
    expiredCoupons,
    totalUsages,
    totalDiscount,
    couponUsageGroups,
  ] = await Promise.all([
    prisma.coupon.count(),

    prisma.coupon.count({
      where: {
        isActive: true,
      },
    }),

    prisma.coupon.count({
      where: {
        isActive: false,
      },
    }),

    prisma.coupon.count({
      where: {
        validUntil: {
          lt: now,
        },
      },
    }),

    prisma.couponUsage.count(),

    prisma.couponUsage.aggregate({
      _sum: {
        discountAmount: true,
      },
    }),

    prisma.couponUsage.groupBy({
      by: ["couponId"],
      _count: {
        _all: true,
      },
      _sum: {
        discountAmount: true,
      },
      orderBy: {
        _count: {
          couponId: "desc",
        },
      },
    }),
  ]);

  const couponIds = couponUsageGroups.map((item) => item.couponId);

  const coupons =
    couponIds.length > 0
      ? await prisma.coupon.findMany({
          where: {
            id: {
              in: couponIds,
            },
          },
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

  const couponMap = new Map(coupons.map((coupon) => [coupon.id, coupon]));

  const performance = couponUsageGroups.map((group) => {
    const coupon = couponMap.get(group.couponId);

    return {
      couponId: group.couponId,
      code: coupon?.code || null,
      type: coupon?.type || null,
      discountValue: coupon?.discountValue || null,
      usageLimit: coupon?.usageLimit ?? null,
      usedCount: coupon?.usedCount ?? group._count._all,
      isActive: coupon?.isActive ?? null,
      validFrom: coupon?.validFrom || null,
      validUntil: coupon?.validUntil || null,
      totalUsages: group._count._all,
      totalDiscountAmount: group._sum.discountAmount || 0,
    };
  });

  return {
    summary: {
      totalCoupons,
      activeCoupons,
      inactiveCoupons,
      expiredCoupons,
      totalUsages,
      totalDiscountAmount: totalDiscount._sum.discountAmount || 0,
    },
    performance,
  };
};

/**
 * ============================================================
 * Transactions
 * ============================================================
 */

const executeTransaction = (callback) => {
  return prisma.$transaction(callback);
};

module.exports = {
  createCoupon,
  getCouponById,
  getCouponByCode,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,

  activateCoupon,
  deactivateCoupon,

  getUserCouponUsageCount,
  createCouponUsage,
  incrementCouponUsage,
  decrementCouponUsage,
  getAvailableCoupons,
  getCouponUsageByRideId,
  getCouponUsagesByCouponId,

  getCouponUsageAnalytics,
  getExpiredCoupons,
  getCouponReport,

  executeTransaction,
  createCouponUsageTx,
  incrementCouponUsageTx,
  updateRideCouponTx,
  createAuditLog,
};
