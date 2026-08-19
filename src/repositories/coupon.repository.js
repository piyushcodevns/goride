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

const incrementCouponUsageTx = (tx, couponId) => {
  return tx.coupon.update({
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

const decrementCouponUsage = (couponId) => {
  return prisma.coupon.update({
    where: {
      id: couponId,
    },
    data: {
      usedCount: {
        decrement: 1,
      },
    },
  });
};

const getAvailableCoupons = (currentDate = new Date()) => {
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

  executeTransaction,
  createCouponUsageTx,
  incrementCouponUsageTx,
  updateRideCouponTx,
  createAuditLog,
};
