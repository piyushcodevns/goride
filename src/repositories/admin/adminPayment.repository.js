const prisma = require("../../config/prisma");

/**
 * Common payment relations for admin.
 */
const adminPaymentInclude = {
  ride: true,

  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      profileImage: true,
      isVerified: true,
    },
  },
};

/**
 * Build admin payment filters.
 */
const buildPaymentWhere = ({
  search,
  status,
  paymentMethod,
  gateway,
  userId,
  rideId,
  fromDate,
  toDate,
}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (gateway) {
    where.gateway = {
      contains: gateway,
      mode: "insensitive",
    };
  }

  if (userId) {
    where.userId = userId;
  }

  if (rideId) {
    where.rideId = rideId;
  }

  if (fromDate || toDate) {
    where.createdAt = {};

    if (fromDate) {
      where.createdAt.gte = fromDate;
    }

    if (toDate) {
      where.createdAt.lte = toDate;
    }
  }

  if (search) {
    where.OR = [
      {
        transactionId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        gateway: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        ride: {
          pickup: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        ride: {
          destination: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

/**
 * Get paginated payments.
 */
const findPayments = async ({
  page = 1,
  limit = 20,
  search,
  status,
  paymentMethod,
  gateway,
  userId,
  rideId,
  fromDate,
  toDate,
}) => {
  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const where = buildPaymentWhere({
    search,
    status,
    paymentMethod,
    gateway,
    userId,
    rideId,
    fromDate,
    toDate,
  });

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: adminPaymentInclude,
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get payment by ID.
 */
const findPaymentById = async (paymentId) => {
  return prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: adminPaymentInclude,
  });
};

/**
 * Get payment statistics.
 */
const getPaymentStats = async () => {
  const [
    statusStats,
    methodStats,
    gatewayStats,
    totalAmount,
    successfulAmount,
  ] = await prisma.$transaction([
    prisma.payment.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),

    prisma.payment.groupBy({
      by: ["paymentMethod"],
      _count: {
        paymentMethod: true,
      },
    }),

    prisma.payment.groupBy({
      by: ["gateway"],
      _count: {
        gateway: true,
      },
    }),

    prisma.payment.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        status: "SUCCESS",
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    status: statusStats,
    paymentMethod: methodStats,
    gateway: gatewayStats,
    total: totalAmount,
    successful: successfulAmount,
  };
};

/**
 * Get revenue report.
 */
const getRevenueReport = async ({ fromDate, toDate }) => {
  const where = {
    status: "SUCCESS",
    paidAt: {
      not: null,
    },
  };

  if (fromDate) {
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    where.paidAt.gte = startDate;
  }

  if (toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    where.paidAt.lte = endDate;
  }

  const [summary, paymentCount] = await prisma.$transaction([
    prisma.payment.aggregate({
      where,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  return {
    totalRevenue: summary._sum.amount?.toString() || "0",
    paymentCount,
    averagePayment: summary._avg.amount?.toString() || "0",
  };
};

/**
 * Update payment.
 */
const updatePayment = async (paymentId, data) => {
  return prisma.payment.update({
    where: {
      id: paymentId,
    },
    data,
    include: adminPaymentInclude,
  });
};

/**
 * Update payment and create audit log atomically.
 */
const updatePaymentWithAudit = async ({ paymentId, data, auditLog }) => {
  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: paymentId,
      },
      data,
      include: adminPaymentInclude,
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return updatedPayment;
  });
};

/**
 * Find payment by transaction ID.
 */
const findPaymentByTransactionId = async (transactionId) => {
  return prisma.payment.findUnique({
    where: {
      transactionId,
    },
  });
};

module.exports = {
  buildPaymentWhere,
  findPayments,
  findPaymentById,
  getPaymentStats,
  getRevenueReport,
  updatePayment,
  updatePaymentWithAudit,
  findPaymentByTransactionId,
};
