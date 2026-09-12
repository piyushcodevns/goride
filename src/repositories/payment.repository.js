const prisma = require("../config/prisma");

const createPayment = (data) => {
  return prisma.payment.create({
    data,
    include: {
      ride: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

/**
 * Get Payment by ID
 */
const getPaymentById = (id) => {
  return prisma.payment.findUnique({
    where: { id },
    include: {
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
    },
  });
};

/**
 * Get Payment by Ride ID
 */
const getPaymentByRideId = (rideId) => {
  return prisma.payment.findUnique({
    where: { rideId },
    include: {
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
    },
  });
};

/**
 * Get Payment by Transaction ID
 */
const getPaymentByTransactionId = (transactionId) => {
  return prisma.payment.findUnique({
    where: {
      transactionId,
    },
  });
};

/**
 * Update Payment Status
 */
const updatePaymentStatus = (id, data) => {
  return prisma.payment.update({
    where: { id },
    data,
  });
};

/**
 * Get User Payment History (bounded)
 */
const getUserPayments = (userId, options = {}) => {
  const take = options.limit ? Math.min(Number(options.limit) || 50, 100) : 50;
  const skip = options.page
    ? (Math.max(1, Number(options.page)) - 1) * take
    : (options.skip ? Number(options.skip) : 0);

  return prisma.payment.findMany({
    where: { userId },
    take,
    skip,
    include: {
      ride: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentByRideId,
  getPaymentByTransactionId,
  updatePaymentStatus,
  getUserPayments,
};
