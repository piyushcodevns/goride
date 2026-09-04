const couponService = require("../services/coupon.service");

/**
 * ============================================================
 * Admin
 * ============================================================
 */

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.admin.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.updateCoupon(
      req.admin.id,
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully.",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.deleteCoupon(
      req.admin.id,
      req.params.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getCouponById = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);

    return res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCoupons = async (req, res, next) => {
  try {
    const result = await couponService.getAllCoupons(req.query);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const activateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.activateCoupon(
      req.admin.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Coupon activated successfully.",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const deactivateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.deactivateCoupon(
      req.admin.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Coupon deactivated successfully.",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const getCouponUsages = async (req, res, next) => {
  try {
    const usages = await couponService.getCouponUsages(req.params.id);

    return res.status(200).json({
      success: true,
      count: usages.length,
      data: usages,
    });
  } catch (error) {
    next(error);
  }
};

const getCouponUsageAnalytics = async (req, res, next) => {
  try {
    const result = await couponService.getCouponUsageAnalytics(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getExpiredCoupons = async (req, res, next) => {
  try {
    const coupons = await couponService.getExpiredCoupons();

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

const getCouponReport = async (req, res, next) => {
  try {
    const report = await couponService.getCouponReport();

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================
 * User
 * ============================================================
 */

const validateCoupon = async (req, res, next) => {
  try {
    const result = await couponService.validateCoupon({
      code: req.body.code,
      userId: req.user.id,
      rideFare: req.body.rideFare,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const result = await couponService.applyCoupon({
      code: req.body.code,
      rideId: req.body.rideId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAvailableCoupons = async (req, res, next) => {
  try {
    const coupons = await couponService.getAvailableCoupons();

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getAllCoupons,
  activateCoupon,
  deactivateCoupon,
  getCouponUsages,

  getCouponUsageAnalytics,
  getExpiredCoupons,
  getCouponReport,

  validateCoupon,
  applyCoupon,
  getAvailableCoupons,
};
