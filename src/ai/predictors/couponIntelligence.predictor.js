const {
  AI_MODEL_VERSION,
  AI_STATUS,
} = require("../utils/aiConstants");

const {
  mean,
} = require("../utils/aiMath");

const analyzeCouponUsage = ({
  usages,
  coupons = [],
}) => {
  if (!Array.isArray(usages) || usages.length < 5) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INSUFFICIENT_COUPON_HISTORY",
      observations: Array.isArray(usages)
        ? usages.length
        : 0,
      requiredMinimumObservations: 5,
      coupons: [],
    };
  }

  const couponMap = new Map();

  for (const usage of usages) {
    if (!couponMap.has(usage.couponId)) {
      couponMap.set(usage.couponId, {
        couponId: usage.couponId,
        totalUsages: 0,
        users: new Set(),
        totalDiscount: 0,
      });
    }

    const item = couponMap.get(usage.couponId);

    item.totalUsages += 1;
    item.users.add(usage.userId);
    item.totalDiscount += Number(
      usage.discountAmount || 0,
    );
  }

  const results = [...couponMap.values()].map((item) => {
    const uniqueUsers = item.users.size;

    const averageDiscount =
      item.totalUsages > 0
        ? item.totalDiscount / item.totalUsages
        : 0;

    let classification = "LOW_ADOPTION";

    if (item.totalUsages >= 20 && uniqueUsers >= 10) {
      classification = "HIGH_PERFORMING";
    } else if (
      item.totalUsages >= 10 &&
      averageDiscount <= 100
    ) {
      classification = "EFFICIENT";
    } else if (item.totalUsages <= 2) {
      classification = "UNDERPERFORMING";
    }

    return {
      couponId: item.couponId,
      totalUsages: item.totalUsages,
      uniqueUsers,
      totalDiscount: Number(
        item.totalDiscount.toFixed(2),
      ),
      averageDiscount: Number(
        averageDiscount.toFixed(2),
      ),
      classification,
    };
  });

  const totalDiscount = results.reduce(
    (sum, coupon) => sum + coupon.totalDiscount,
    0,
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    observations: usages.length,
    summary: {
      totalCouponsAnalyzed: results.length,
      totalUsages: usages.length,
      totalDiscount: Number(totalDiscount.toFixed(2)),
      averageDiscount: Number(
        mean(
          usages.map((usage) =>
            Number(usage.discountAmount || 0),
          ),
        ).toFixed(2),
      ),
    },
    coupons: results.sort(
      (a, b) => b.totalUsages - a.totalUsages,
    ),
    metadataAvailable: coupons.length > 0,
  };
};

module.exports = {
  analyzeCouponUsage,
};
