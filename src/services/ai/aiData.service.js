const getRatingHistory = async ({ fromDate, toDate }) => {
  return prisma.rideReview.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
      rating: {
        gte: 1,
        lte: 5,
      },
    },
    select: {
      id: true,
      rating: true,
      createdAt: true,
      ride: {
        select: {
          id: true,
          vehicleType: true,
          distance: true,
          duration: true,
          isScheduled: true,
          scheduledFor: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getRatingHistory = getRatingHistory;

const getRevenueHistory = async ({
  fromDate,
  toDate,
}) => {
  return prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(fromDate),
        lt: new Date(toDate),
      },
      status: "SUCCESS",
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      paidAt: true,
      ride: {
        select: {
          id: true,
          status: true,
          vehicleType: true,
          distance: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports.getRevenueHistory =
  getRevenueHistory;