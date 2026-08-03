const prisma = require("../config/prisma");

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

const getCouponById = (id) => {
  return prisma.coupon.findUnique({
    where: { id },
  });
};

const getCouponByCode = (code) => {
  return prisma.coupon.findUnique({
    where: {
      code,
    },
  });
};

const getAllCoupons = () => {
  return prisma.coupon.findMany({
    orderBy: {
      createdAt: "desc",
    },
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

const getUserCouponUsageCount = (couponId, userId) => {
  return prisma.couponUsage.count({
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

  executeTransaction,
  createCouponUsageTx,
  incrementCouponUsageTx,
  updateRideCouponTx,
};
