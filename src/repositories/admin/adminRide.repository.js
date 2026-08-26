const prisma = require("../../config/prisma");

/**
 * Build admin ride filters.
 */
const buildRideWhere = ({
  search,
  status,
  vehicleType,
  isScheduled,
  userId,
  driverId,
  fromDate,
  toDate,
}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }

  if (typeof isScheduled === "boolean") {
    where.isScheduled = isScheduled;
  }

  if (userId) {
    where.userId = userId;
  }

  if (driverId) {
    where.driverId = driverId;
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
        pickup: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        destination: {
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
        driver: {
          user: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        driver: {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        driver: {
          user: {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  return where;
};

/**
 * Common admin ride relations.
 */
const adminRideInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      profileImage: true,
    },
  },

  driver: {
    include: {
      vehicle: true,

      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
    },
  },

  payment: true,

  coupon: true,

  rideReview: true,

  couponUsage: true,

  fareAudit: true,
};

/**
 * Get paginated rides for admin.
 */
const findRides = async ({
  page = 1,
  limit = 10,
  search,
  status,
  vehicleType,
  isScheduled,
  userId,
  driverId,
  fromDate,
  toDate,
}) => {
  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const where = buildRideWhere({
    search,
    status,
    vehicleType,
    isScheduled,
    userId,
    driverId,
    fromDate,
    toDate,
  });

  const [rides, total] = await prisma.$transaction([
    prisma.ride.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: adminRideInclude,
    }),

    prisma.ride.count({
      where,
    }),
  ]);

  return {
    rides,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get ride by ID for admin.
 */
const findRideById = async (rideId, db = prisma) => {
  return db.ride.findUnique({
    where: {
      id: rideId,
    },
    include: adminRideInclude,
  });
};

/**
 * Get rides by user.
 */
const findRidesByUserId = async (
  userId,
  { page = 1, limit = 10 } = {},
) => {
  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const where = {
    userId,
  };

  const [rides, total] = await prisma.$transaction([
    prisma.ride.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: adminRideInclude,
    }),

    prisma.ride.count({
      where,
    }),
  ]);

  return {
    rides,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get rides by driver.
 */
const findRidesByDriverId = async (
  driverId,
  { page = 1, limit = 10 } = {},
) => {
  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  const where = {
    driverId,
  };

  const [rides, total] = await prisma.$transaction([
    prisma.ride.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: adminRideInclude,
    }),

    prisma.ride.count({
      where,
    }),
  ]);

  return {
    rides,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update ride.
 */
const updateRide = async (rideId, data, db = prisma) => {
  return db.ride.update({
    where: {
      id: rideId,
    },
    data,
    include: adminRideInclude,
  });
};

/**
 * Update ride and create audit log atomically.
 */
const updateRideWithAudit = async ({ rideId, data, auditLog }) => {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: {
        id: rideId,
      },
      select: {
        id: true,
        driverId: true,
        status: true,
      },
    });

    if (!ride) {
      return null;
    }

    const updatedRide = await tx.ride.update({
      where: {
        id: rideId,
      },
      data,
      include: adminRideInclude,
    });

    // Driver becomes available when ride is completed/cancelled.
    if (
      ride.driverId &&
      ["COMPLETED", "CANCELLED"].includes(data.status)
    ) {
      await tx.driver.update({
        where: {
          id: ride.driverId,
        },
        data: {
          availability: "AVAILABLE",
        },
      });
    }

    await tx.auditLog.create({
      data: auditLog,
    });

    return updatedRide;
  });
};

/**
 * Assign driver atomically.
 */
const assignDriverWithAudit = async ({
  rideId,
  driverId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: {
        id: rideId,
      },
    });

    if (!ride) {
      return null;
    }

    const updatedRide = await tx.ride.update({
      where: {
        id: rideId,
      },
      data: {
        driverId,
        status: "ACCEPTED",
      },
      include: adminRideInclude,
    });

    await tx.driver.update({
      where: {
        id: driverId,
      },
      data: {
        availability: "BUSY",
      },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "ASSIGN",
        entity: "RIDE",
        entityId: rideId,
        metadata: {
          previousDriverId: ride.driverId,
          newDriverId: driverId,
          previousStatus: ride.status,
          newStatus: "ACCEPTED",
        },
        ipAddress,
        userAgent,
      },
    });

    return updatedRide;
  });
};

/**
 * Reassign driver atomically.
 */
const reassignDriverWithAudit = async ({
  rideId,
  oldDriverId,
  newDriverId,
  adminId,
  ipAddress,
  userAgent,
}) => {
  return prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: {
        id: rideId,
      },
      data: {
        driverId: newDriverId,
      },
      include: adminRideInclude,
    });

    if (oldDriverId) {
      await tx.driver.update({
        where: {
          id: oldDriverId,
        },
        data: {
          availability: "AVAILABLE",
        },
      });
    }

    await tx.driver.update({
      where: {
        id: newDriverId,
      },
      data: {
        availability: "BUSY",
      },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "REASSIGN",
        entity: "RIDE",
        entityId: rideId,
        metadata: {
          previousDriverId: oldDriverId,
          newDriverId,
        },
        ipAddress,
        userAgent,
      },
    });

    return updatedRide;
  });
};

/**
 * Force complete ride atomically.
 */
const forceCompleteRideWithAudit = async ({
  rideId,
  driverId,
  adminId,
  previousStatus,
  ipAddress,
  userAgent,
}) => {
  return prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: "COMPLETED",
      },
      include: adminRideInclude,
    });

    if (driverId) {
      await tx.driver.update({
        where: {
          id: driverId,
        },
        data: {
          availability: "AVAILABLE",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        adminId,
        action: "FORCE_COMPLETE",
        entity: "RIDE",
        entityId: rideId,
        metadata: {
          previousStatus,
          newStatus: "COMPLETED",
          driverId,
        },
        ipAddress,
        userAgent,
      },
    });

    return updatedRide;
  });
};

/**
 * Get ride statistics.
 */
const getRideStats = async () => {
  const [statusStats, scheduledStats, vehicleTypeStats] =
    await prisma.$transaction([
      prisma.ride.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),

      prisma.ride.groupBy({
        by: ["isScheduled"],
        _count: {
          isScheduled: true,
        },
      }),

      prisma.ride.groupBy({
        by: ["vehicleType"],
        _count: {
          vehicleType: true,
        },
      }),
    ]);

  return {
    status: statusStats,
    scheduled: scheduledStats,
    vehicleType: vehicleTypeStats,
  };
};

module.exports = {
  buildRideWhere,
  adminRideInclude,
  findRides,
  findRideById,
  findRidesByUserId,
  findRidesByDriverId,
  getRideStats,
  updateRide,
  updateRideWithAudit,
  assignDriverWithAudit,
  reassignDriverWithAudit,
  forceCompleteRideWithAudit,
};
