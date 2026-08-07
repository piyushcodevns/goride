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

  return coupon;
};

const updateCoupon = async (couponId, payload) => {
  const coupon = await getExistingCouponOrThrow(couponId);

  const updateData = {};

  if (payload.code) {
    const code = normalizeCouponCode(payload.code);

    const existingCoupon = await couponRepository.getCouponByCode(code);

    if (existingCoupon && existingCoupon.id !== coupon.id) {
      throw new ConflictError("Coupon code already exists.");
    }

    updateData.code = code;
  }

  if (payload.description !== undefined)
    updateData.description = payload.description;

  if (payload.type !== undefined) updateData.type = payload.type;

  if (payload.discountValue !== undefined)
    updateData.discountValue = payload.discountValue;

  if (payload.minimumRideFare !== undefined)
    updateData.minimumRideFare = payload.minimumRideFare;

  if (payload.maximumDiscount !== undefined)
    updateData.maximumDiscount = payload.maximumDiscount;

  if (payload.usageLimit !== undefined)
    updateData.usageLimit = payload.usageLimit;

  if (payload.perUserUsageLimit !== undefined)
    updateData.perUserUsageLimit = payload.perUserUsageLimit;

  if (payload.validFrom !== undefined) updateData.validFrom = payload.validFrom;

  if (payload.validUntil !== undefined)
    updateData.validUntil = payload.validUntil;

  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

  const validFrom = updateData.validFrom ?? coupon.validFrom;

  const validUntil = updateData.validUntil ?? coupon.validUntil;

  validateCouponDates(validFrom, validUntil);

  return couponRepository.updateCoupon(couponId, updateData);
};

const deleteCoupon = async (couponId) => {
  await getExistingCouponOrThrow(couponId);

  await couponRepository.deleteCoupon(couponId);

  return {
    success: true,
    message: "Coupon deleted successfully.",
  };
};

const getCouponById = async (couponId) => {
  return getExistingCouponOrThrow(couponId);
};

const getAllCoupons = async () => {
  return couponRepository.getAllCoupons();
};

const activateCoupon = async (couponId) => {
  await getExistingCouponOrThrow(couponId);

  return couponRepository.activateCoupon(couponId);
};

const deactivateCoupon = async (couponId) => {
  await getExistingCouponOrThrow(couponId);

  return couponRepository.deactivateCoupon(couponId);
};

/**
 * ============================================================
 * Coupon Validation Helpers
 * ============================================================
 */

const validateCouponEligibility = async (coupon, userId, rideFare) => {
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

  const rideFare = normalizeRideFare(ride.finalFare) || normalizeRideFare(ride.estimatedFare);

  await validateCouponEligibility(coupon, userId, rideFare);

  const discount = calculateDiscount(coupon, rideFare);
  console.log("Discount Object:", discount);

  await couponRepository.executeTransaction(async (tx) => {
    console.log("Final Fare Going To DB:", discount.finalFare);
    await couponRepository.updateRideCouponTx(
      tx,
      ride.id,
      coupon.id,
      discount.discountAmount,
      discount.finalFare,
    );

    await couponRepository.createCouponUsageTx(tx, {
      couponId: coupon.id,
      rideId: ride.id,
      userId,
      discountAmount: discount.discountAmount,
    });

    await couponRepository.incrementCouponUsageTx(tx, coupon.id);
  });

  await notificationService.dispatchNotification(
    NotificationFactory.createCouponAppliedNotification({
      userId,
      rideId: ride.id,
      couponCode: coupon.code,
      discountAmount: discount.discountAmount,
    }),
  );

  return {
    success: true,
    message: "Coupon applied successfully.",
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
    },
    ...discount,
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

  // User
  validateCoupon,
  applyCoupon,
  getAvailableCoupons,

  // Helpers
  calculateDiscount,
  normalizeRideFare,
};
