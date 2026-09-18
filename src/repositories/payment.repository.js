const prisma = require("../config/prisma");

const createPayment = (data, db = prisma) => {
  return db.payment.create({
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
const getPaymentById = (id, db = prisma) => {
  return db.payment.findUnique({
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
const getPaymentByRideId = (rideId, db = prisma) => {
  return db.payment.findUnique({
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
const getPaymentByTransactionId = (transactionId, db = prisma) => {
  return db.payment.findUnique({
    where: {
      transactionId,
    },
  });
};

/**
 * Get Payment by Gateway Order ID
 */
const getPaymentByOrderId = (orderId, db = prisma) => {
  return db.payment.findUnique({
    where: {
      orderId,
    },
    include: {
      ride: true,
    },
  });
};

/**
 * Update Payment Status
 */
const updatePaymentStatus = (id, data, db = prisma) => {
  return db.payment.update({
    where: { id },
    data,
  });
};

/**
 * Upsert Payment for Ride (prevents unique rideId constraint violation on retry)
 */
const upsertPaymentForRide = async (data, db = prisma) => {
  const { rideId, userId, amount, paymentMethod, status = "PENDING", gateway, orderId } = data;

  return db.payment.upsert({
    where: { rideId },
    update: {
      amount,
      paymentMethod,
      status,
      gateway,
      orderId,
    },
    create: {
      rideId,
      userId,
      amount,
      paymentMethod,
      status,
      gateway,
      orderId,
    },
    include: {
      ride: true,
    },
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
  getPaymentByOrderId,
  updatePaymentStatus,
  upsertPaymentForRide,
  getUserPayments,
};
