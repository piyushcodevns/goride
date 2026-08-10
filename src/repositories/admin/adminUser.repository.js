const prisma = require("../../config/prisma");

/**
 * Get paginated users with search, filters and sorting.
 */
const findUsers = async ({
  page = 1,
  limit = 20,
  search,
  isActive,
  isVerified,
  emailVerified,
  role,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const where = {
    role: {
      in: ["USER", "DRIVER"],
    },
  };

  // Search by name, email or phone
  if (search) {
    where.OR = [
      {
        fullName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Active / inactive filter
  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  // Account verification filter
  if (typeof isVerified === "boolean") {
    where.isVerified = isVerified;
  }

  // Email verification filter
  if (typeof emailVerified === "boolean") {
    where.emailVerified = emailVerified;
  }

  // Role filter
  if (role) {
    where.role = role;
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        profileImage: true,
        emailVerified: true,
        isVerified: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    users,
    total,
  };
};

/**
 * Get user by ID.
 */
const findUserById = async (userId) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      gender: true,
      profileImage: true,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Get user's ride history.
 */
const findUserRideHistory = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [rides, total] = await prisma.$transaction([
    prisma.ride.findMany({
      where: {
        userId,
      },
      skip,
      take: limit,
      select: {
        id: true,
        pickup: true,
        destination: true,
        distance: true,
        duration: true,
        vehicleType: true,
        status: true,
        estimatedFare: true,
        finalFare: true,
        discountAmount: true,
        createdAt: true,
        updatedAt: true,
        driverId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.ride.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    rides,
    total,
  };
};

/**
 * Get user's payment history.
 */
const findUserPaymentHistory = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where: {
        userId,
      },
      skip,
      take: limit,
      select: {
        id: true,
        rideId: true,
        amount: true,
        paymentMethod: true,
        status: true,
        gateway: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.payment.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    payments,
    total,
  };
};

/**
 * Get user's coupon usage history.
 */
const findUserCouponHistory = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [couponUsages, total] = await prisma.$transaction([
    prisma.couponUsage.findMany({
      where: {
        userId,
      },
      skip,
      take: limit,
      select: {
        id: true,
        couponId: true,
        rideId: true,
        discountAmount: true,
        usedAt: true,
        coupon: {
          select: {
            id: true,
            code: true,
            description: true,
            type: true,
            discountValue: true,
          },
        },
      },
      orderBy: {
        usedAt: "desc",
      },
    }),

    prisma.couponUsage.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    couponUsages,
    total,
  };
};

/**
 * Get user's notification history.
 */
const findUserNotifications = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: {
        userId,
      },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        channel: true,
        status: true,
        priority: true,
        metadata: true,
        readAt: true,
        sentAt: true,
        failedAt: true,
        retryCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.notification.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    notifications,
    total,
  };
};

/**
 * Update user active status.
 */
const updateUserStatus = async (userId, isActive) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isActive,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      emailVerified: true,
      isActive: true,
      updatedAt: true,
    },
  });
};

module.exports = {
  findUsers,
  findUserById,
  findUserRideHistory,
  findUserPaymentHistory,
  findUserCouponHistory,
  findUserNotifications,
  updateUserStatus,
};
