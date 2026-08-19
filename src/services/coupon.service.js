const couponRepository = require("../repositories/coupon.repository");
const rideRepository = require("../repositories/ride.repository");

const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require("../utils/AppError");

const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

const normalizeCouponCode = (code) => {
  return code.trim().toUpperCase();
};

const validateCouponDates = (validFrom, validUntil) => {
  if (validUntil <= validFrom) {
    throw new BadRequestError(
      "Coupon validUntil must be greater than validFrom.",
    );
  }
};

const getExistingCouponOrThrow = async (id) => {
  const coupon = await couponRepository.getCouponById(id);

  if (!coupon) {
    throw new NotFoundError("Coupon not found.");
  }

  return coupon;
};

const normalizeRideFare = (fare) => {
  const numericFare = Number(fare);

  if (!Number.isFinite(numericFare) || numericFare < 0) {
    return 0;
  }

  return numericFare;
};

/**
 * ============================================================
 * Admin
 * ============================================================
 */

const createCoupon = async (adminId, payload) => {
  const code = normalizeCouponCode(payload.code);

  const existingCoupon = await couponRepository.getCouponByCode(code);

  if (existingCoupon) {
    throw new ConflictError("Coupon code already exists.");
  }

  validateCouponDates(payload.validFrom, payload.validUntil);

  const coupon = await couponRepository.createCoupon({
    code,
    description: payload.description,

    type: payload.type,

    discountValue: payload.discountValue,

    minimumRideFare: payload.minimumRideFare,

    maximumDiscount: payload.maximumDiscount,

    usageLimit: payload.usageLimit,

    perUserUsageLimit: payload.perUserUsageLimit,

    validFrom: payload.validFrom,

    validUntil: payload.validUntil,

    isActive: payload.isActive ?? true,

    createdById: adminId,
  });

  if (adminId) {
    await couponRepository.createAuditLog({
      adminId,
      action: "CREATE",
      entity: "COUPON",
      entityId: coupon.id,
      metadata: {
        code: coupon.code,
        type: coupon.type,
        discountValue: coupon.discountValue,
      },
    });
  }

  return coupon;
};

const updateCoupon = async (adminIdOrCouponId, couponIdOrPayload, payload) => {
  let adminId, couponId, updatePayload;
  if (typeof couponIdOrPayload === "string") {
    adminId = adminIdOrCouponId;
    couponId = couponIdOrPayload;
    updatePayload = payload || {};
  } else {
    couponId = adminIdOrCouponId;
    updatePayload = couponIdOrPayload || {};
  }

  const coupon = await getExistingCouponOrThrow(couponId);

  const updateData = {};

  if (updatePayload.code) {
    const code = normalizeCouponCode(updatePayload.code);

    const existingCoupon = await couponRepository.getCouponByCode(code);

    if (existingCoupon && existingCoupon.id !== coupon.id) {
      throw new ConflictError("Coupon code already exists.");
    }

    updateData.code = code;
  }

  if (updatePayload.description !== undefined)
    updateData.description = updatePayload.description;

  if (updatePayload.type !== undefined) updateData.type = updatePayload.type;

  if (updatePayload.discountValue !== undefined)
    updateData.discountValue = updatePayload.discountValue;

  if (updatePayload.minimumRideFare !== undefined)
    updateData.minimumRideFare = updatePayload.minimumRideFare;

  if (updatePayload.maximumDiscount !== undefined)
    updateData.maximumDiscount = updatePayload.maximumDiscount;

  if (updatePayload.usageLimit !== undefined)
    updateData.usageLimit = updatePayload.usageLimit;

  if (updatePayload.perUserUsageLimit !== undefined)
    updateData.perUserUsageLimit = updatePayload.perUserUsageLimit;

  if (updatePayload.validFrom !== undefined) updateData.validFrom = updatePayload.validFrom;

  if (updatePayload.validUntil !== undefined)
    updateData.validUntil = updatePayload.validUntil;

  if (updatePayload.isActive !== undefined) updateData.isActive = updatePayload.isActive;

  const validFrom = updateData.validFrom ?? coupon.validFrom;

  const validUntil = updateData.validUntil ?? coupon.validUntil;

  validateCouponDates(validFrom, validUntil);

  const finalType = updateData.type ?? coupon.type;
  const finalDiscountValue = updateData.discountValue ?? coupon.discountValue;
  const finalMaximumDiscount =
    updateData.maximumDiscount !== undefined
      ? updateData.maximumDiscount
      : coupon.maximumDiscount;

  if (finalType === "PERCENTAGE") {
    if (finalDiscountValue > 100) {
      throw new BadRequestError("Percentage discount cannot exceed 100%.");
    }
    if (finalMaximumDiscount === null || finalMaximumDiscount === undefined) {
      throw new BadRequestError(
        "Maximum discount is required for percentage coupons.",
      );
    }
  }

  const updatedCoupon = await couponRepository.updateCoupon(couponId, updateData);

  if (adminId) {
    await couponRepository.createAuditLog({
      adminId,
      action: "UPDATE",
      entity: "COUPON",
      entityId: couponId,
      metadata: updateData,
    });
  }

  return updatedCoupon;
};

const deleteCoupon = async (adminIdOrCouponId, couponId) => {
  let adminId, targetId;
  if (couponId) {
    adminId = adminIdOrCouponId;
    targetId = couponId;
  } else {
    targetId = adminIdOrCouponId;
  }

  const coupon = await getExistingCouponOrThrow(targetId);

  await couponRepository.deleteCoupon(targetId);

  if (adminId) {
    await couponRepository.createAuditLog({
      adminId,
      action: "DELETE",
      entity: "COUPON",
      entityId: targetId,
      metadata: { code: coupon.code },
    });
  }

  return {
    success: true,
    message: "Coupon deleted successfully.",
  };
};

const getCouponById = async (couponId) => {
  return getExistingCouponOrThrow(couponId);
};

const getAllCoupons = async (queryParams = {}) => {
  return couponRepository.getAllCoupons(queryParams);
};

const activateCoupon = async (adminIdOrCouponId, couponId) => {
  let adminId, targetId;
  if (couponId) {
    adminId = adminIdOrCouponId;
    targetId = couponId;
  } else {
    targetId = adminIdOrCouponId;
  }

  await getExistingCouponOrThrow(targetId);

  const coupon = await couponRepository.activateCoupon(targetId);

  if (adminId) {
    await couponRepository.createAuditLog({
      adminId,
      action: "ACTIVATE",
      entity: "COUPON",
      entityId: targetId,
      metadata: { isActive: true },
    });
  }

  return coupon;
};

const deactivateCoupon = async (adminIdOrCouponId, couponId) => {
  let adminId, targetId;
  if (couponId) {
    adminId = adminIdOrCouponId;
    targetId = couponId;
  } else {
    targetId = adminIdOrCouponId;
  }

  await getExistingCouponOrThrow(targetId);

  const coupon = await couponRepository.deactivateCoupon(targetId);

  if (adminId) {
    await couponRepository.createAuditLog({
      adminId,
      action: "SUSPEND",
      entity: "COUPON",
      entityId: targetId,
      metadata: { isActive: false },
    });
  }

  return coupon;
};

const getCouponUsages = async (couponId) => {
  await getExistingCouponOrThrow(couponId);

  return couponRepository.getCouponUsagesByCouponId(couponId);
};

/**
 * ============================================================
 * Coupon Validation Helpers
 * ============================================================
 */

const validateCouponEligibility = async (coupon, userId, rideFare, db) => {
  const now = new Date();

  if (!coupon.isActive) {
    throw new BadRequestError("This coupon is currently inactive.");
  }

  if (coupon.validFrom > now) {
    throw new BadRequestError("This coupon is not yet available.");
  }

  if (coupon.validUntil < now) {
    throw new BadRequestError("This coupon has expired.");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new BadRequestError("Coupon usage limit has been reached.");
  }

  const userUsageCount = await couponRepository.getUserCouponUsageCount(
    coupon.id,
    userId,
    db,
  );

  if (userUsageCount >= coupon.perUserUsageLimit) {
    throw new BadRequestError(
      "You have already reached the usage limit for this coupon.",
    );
  }

  if (rideFare < coupon.minimumRideFare) {
    throw new BadRequestError(
      `Minimum ride fare should be ₹${coupon.minimumRideFare}.`,
    );
  }

  return true;
};

const calculateDiscount = (coupon, rideFare) => {
  const normalizedFare = normalizeRideFare(rideFare);
  let discount = 0;

  if (coupon.type === "FLAT") {
    discount = normalizeRideFare(coupon.discountValue);
  } else {
    discount = (normalizedFare * normalizeRideFare(coupon.discountValue)) / 100;

    if (coupon.maximumDiscount !== null && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }
  }

  if (discount > normalizedFare) {
    discount = normalizedFare;
  }

  const discountAmount = Number(discount.toFixed(2));
  const finalFare = Math.max(normalizedFare - discountAmount, 0);

  return {
    originalFare: normalizedFare,
    discountAmount,
    finalFare: Number(finalFare.toFixed(2)),
  };
};

/**
 * ============================================================
 * User
 * ============================================================
 */

const validateCoupon = async ({ code, userId, rideFare }) => {
  const couponCode = normalizeCouponCode(code);

  const coupon = await couponRepository.getCouponByCode(couponCode);

  if (!coupon) {
    throw new NotFoundError("Coupon not found.");
  }

  await validateCouponEligibility(coupon, userId, rideFare);

  const discount = calculateDiscount(coupon, rideFare);

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
    },
    ...discount,
  };
};

/**
 * ============================================================
 * Apply Coupon
 * ============================================================
 */

const applyCoupon = async ({ code, rideId, userId }) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.userId !== userId) {
    throw new BadRequestError(
      "You are not allowed to apply a coupon to this ride.",
    );
  }

  if (ride.status !== "REQUESTED") {
    throw new BadRequestError(
      "Coupon can only be applied before the ride is accepted.",
    );
  }

  if (ride.couponId) {
    throw new ConflictError("A coupon has already been applied to this ride.");
  }

  const couponCode = normalizeCouponCode(code);

  const coupon = await couponRepository.getCouponByCode(couponCode);

  if (!coupon) {
    throw new NotFoundError("Coupon not found.");
  }

  const rideFare =
    normalizeRideFare(ride.finalFare) ||
    normalizeRideFare(ride.estimatedFare);

  await validateCouponEligibility(coupon, userId, rideFare);

  let discountResult;
  let finalCoupon = coupon;

  await couponRepository.executeTransaction(async (tx) => {
    const freshCoupon = await couponRepository.getCouponById(coupon.id, tx);

    if (!freshCoupon) {
      throw new NotFoundError("Coupon not found.");
    }

    await validateCouponEligibility(freshCoupon, userId, rideFare, tx);

    discountResult = calculateDiscount(freshCoupon, rideFare);
    finalCoupon = freshCoupon;

    await couponRepository.updateRideCouponTx(
      tx,
      ride.id,
      freshCoupon.id,
      discountResult.discountAmount,
      discountResult.finalFare,
    );

    await couponRepository.createCouponUsageTx(tx, {
      couponId: freshCoupon.id,
      rideId: ride.id,
      userId,
      discountAmount: discountResult.discountAmount,
    });

    await couponRepository.incrementCouponUsageTx(tx, freshCoupon.id);
  });

  await notificationService.dispatchNotification(
    NotificationFactory.createCouponAppliedNotification({
      userId,
      rideId: ride.id,
      couponCode: finalCoupon.code,
      discountAmount: discountResult.discountAmount,
    }),
  );

  return {
    success: true,
    message: "Coupon applied successfully.",
    coupon: {
      id: finalCoupon.id,
      code: finalCoupon.code,
      type: finalCoupon.type,
    },
    ...discountResult,
  };
};

/**
 * ============================================================
 * Get Available Coupons
 * ============================================================
 */

const getAvailableCoupons = async () => {
  return couponRepository.getAvailableCoupons();
};

/**
 * ============================================================
 * Exports
 * ============================================================
 */

module.exports = {
  // Admin
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getAllCoupons,
  activateCoupon,
  deactivateCoupon,
  getCouponUsages,

  // User
  validateCoupon,
  applyCoupon,
  getAvailableCoupons,

  // Helpers
  calculateDiscount,
  normalizeRideFare,
};
