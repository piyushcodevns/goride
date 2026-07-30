const prisma = require("../config/prisma");

/**
 * Create Payment
 */
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
      user: true,
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
      user: true,
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
 * Get User Payment History
 */
const getUserPayments = (userId) => {
  return prisma.payment.findMany({
    where: { userId },
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
  updatePaymentStatus,
  getUserPayments,
};