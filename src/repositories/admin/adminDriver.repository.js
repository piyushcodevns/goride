const prisma = require("../../config/prisma");

/**
 * Get paginated drivers with search, status,
 * availability filters and sorting.
 */
const findDrivers = async ({
  page = 1,
  limit = 20,
  search,
  status,
  availability,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const where = {};

  // Search by driver/user information
  if (search) {
    where.OR = [
      {
        licenseNumber: {
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
    ];
  }

  // Driver status filter
  if (status) {
    where.status = status;
  }

  // Driver availability filter
  if (availability) {
    where.availability = availability;
  }

  const [drivers, total] = await prisma.$transaction([
    prisma.driver.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        licenseNumber: true,
        status: true,
        availability: true,
        experience: true,
        averageRating: true,
        totalRatings: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true,
            isVerified: true,
            emailVerified: true,
            isActive: true,
            isBlocked: true,
            deletedAt: true,
          },
        },

        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleType: true,
            brand: true,
            model: true,
            color: true,
            seats: true,
          },
        },
      },

      orderBy: {
        [sortBy]: sortOrder,
      },
    }),

    prisma.driver.count({
      where,
    }),
  ]);

  return {
    drivers,
    total,
  };
};

/**
 * Get all pending drivers.
 */
const findPendingDrivers = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const where = {
    status: "PENDING",
  };

  const [drivers, total] = await prisma.$transaction([
    prisma.driver.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        licenseNumber: true,
        status: true,
        availability: true,
        experience: true,
        averageRating: true,
        totalRatings: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true,
            isVerified: true,
            emailVerified: true,
            isActive: true,
            isBlocked: true,
            deletedAt: true,
          },
        },

        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleType: true,
            brand: true,
            model: true,
            color: true,
            seats: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.driver.count({
      where,
    }),
  ]);

  return {
    drivers,
    total,
  };
};

/**
 * Get complete driver details.
 */
const findDriverById = async (driverId) => {
  return prisma.driver.findUnique({
    where: {
      id: driverId,
    },

    select: {
      id: true,
      userId: true,
      licenseNumber: true,
      status: true,
      availability: true,
      experience: true,
      averageRating: true,
      totalRatings: true,
      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          gender: true,
          profileImage: true,
          role: true,
          isVerified: true,
          emailVerified: true,
          isActive: true,
          isBlocked: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      vehicle: {
        select: {
          id: true,
          vehicleNumber: true,
          vehicleType: true,
          brand: true,
          model: true,
          color: true,
          seats: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
};

/**
 * Get the account and KYC state required before approving a driver.
 */
const findDriverApprovalEligibility = async (driverId) => {
  return prisma.driver.findUnique({
    where: {
      id: driverId,
    },
    select: {
      id: true,
      status: true,
      user: {
        select: {
          id: true,
          isActive: true,
          isBlocked: true,
          deletedAt: true,
        },
      },
      documents: {
        select: {
          documentType: true,
          status: true,
        },
      },
    },
  });
};

/**
 * Get driver's vehicle.
 */
const findDriverVehicle = async (driverId) => {
  return prisma.vehicle.findUnique({
    where: {
      driverId,
    },

    select: {
      id: true,
      driverId: true,
      vehicleType: true,
      vehicleNumber: true,
      brand: true,
      model: true,
      color: true,
      seats: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Get driver's trip history.
 */
const findDriverTrips = async ({ driverId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const where = {
    driverId,
  };

  const [rides, total] = await prisma.$transaction([
    prisma.ride.findMany({
      where,
      skip,
      take: limit,

      select: {
        id: true,
        userId: true,
        driverId: true,
        pickup: true,
        destination: true,
        distance: true,
        duration: true,
        vehicleType: true,
        status: true,
        estimatedFare: true,
        finalFare: true,
        platformFee: true,
        bookingFee: true,
        surgeAmount: true,
        airportCharge: true,
        tollCharge: true,
        waitingCharge: true,
        gstAmount: true,
        discountAmount: true,
        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.ride.count({
      where,
    }),
  ]);

  return {
    rides,
    total,
  };
};

/**
 * Get driver's ratings and reviews.
 */
const findDriverRatings = async ({ driverId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const where = {
    driverId,
  };

  const [ratings, total] = await prisma.$transaction([
    prisma.rideReview.findMany({
      where,
      skip,
      take: limit,

      select: {
        id: true,
        rideId: true,
        userId: true,
        driverId: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.rideReview.count({
      where,
    }),
  ]);

  return {
    ratings,
    total,
  };
};

/**
 * Get driver's earnings summary.
 */
const findDriverEarnings = async (driverId) => {
  const where = {
    driverId,
    status: "COMPLETED",
  };

  const [summary, rides] = await prisma.$transaction([
    prisma.ride.aggregate({
      where,
      _sum: {
        finalFare: true,
        platformFee: true,
        bookingFee: true,
        gstAmount: true,
        waitingCharge: true,
        surgeAmount: true,
        discountAmount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.ride.findMany({
      where,
      select: {
        id: true,
        finalFare: true,
        platformFee: true,
        bookingFee: true,
        gstAmount: true,
        waitingCharge: true,
        surgeAmount: true,
        discountAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  const grossEarnings = Number(summary._sum.finalFare || 0);

  const platformFee = Number(summary._sum.platformFee || 0);
  const bookingFee = Number(summary._sum.bookingFee || 0);
  const gstAmount = Number(summary._sum.gstAmount || 0);

  const driverEarnings = grossEarnings - platformFee - bookingFee - gstAmount;

  return {
    totalCompletedRides: summary._count.id,
    grossEarnings,
    platformFee,
    bookingFee,
    gstAmount,
    driverEarnings,
    recentEarnings: rides,
  };
};

/**
 * Get driver's KYC information.
 *
 * IMPORTANT:
 * Raw Aadhar number is never returned.
 * Only masked identity information is exposed.
 */
const findDriverKyc = async (driverId) => {
  const driver = await prisma.driver.findUnique({
    where: {
      id: driverId,
    },

    select: {
      id: true,
      licenseNumber: true,
      aadharNumber: true,
      status: true,
    },
  });

  if (!driver) {
    return null;
  }

  const maskedAadhar =
    driver.aadharNumber && driver.aadharNumber.length === 12
      ? `XXXXXXXX${driver.aadharNumber.slice(-4)}`
      : null;

  return {
    driverId: driver.id,
    licenseNumber: driver.licenseNumber,
    maskedAadhar,
    status: driver.status,
  };
};

/**
 * Update driver status with audit log atomically.
 */
const updateDriverStatusWithAudit = async ({
  driverId,
  status,
  availability,
  auditLog,
  expectedStatus,
}) => {
  return prisma.$transaction(async (tx) => {
    const where = {
      id: driverId,
      ...(expectedStatus
        ? {
            status: expectedStatus,
          }
        : {}),
    };

    const existingDriver = await tx.driver.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!existingDriver) {
      return null;
    }

    const updatedDriver = await tx.driver.update({
      where: {
        id: driverId,
      },

      data: {
        status,

        ...(availability
          ? {
              availability,
            }
          : {}),
      },

      select: {
        id: true,
        userId: true,
        licenseNumber: true,
        status: true,
        availability: true,
        experience: true,
        averageRating: true,
        totalRatings: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return updatedDriver;
  });
};

/**
 * Get driver statistics.
 */
const findDriverStatistics = async (driverId) => {
  const where = {
    driverId,
  };

  const [rideStats, completedStats] = await prisma.$transaction([
    prisma.ride.groupBy({
      by: ["status"],
      where,
      _count: {
        id: true,
      },
    }),

    prisma.ride.aggregate({
      where: {
        driverId,
        status: "COMPLETED",
      },
      _avg: {
        finalFare: true,
        distance: true,
        duration: true,
      },
      _sum: {
        finalFare: true,
        distance: true,
      },
    }),
  ]);

  const stats = {
    totalTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    acceptedTrips: 0,
    arrivedTrips: 0,
    startedTrips: 0,
    totalDistance: Number(completedStats._sum.distance || 0),
    totalGrossFare: Number(completedStats._sum.finalFare || 0),
    averageFare: Number(completedStats._avg.finalFare || 0),
    averageDistance: Number(completedStats._avg.distance || 0),
    averageDuration: Number(completedStats._avg.duration || 0),
  };

  for (const item of rideStats) {
    const count = item._count.id;

    stats.totalTrips += count;

    if (item.status === "COMPLETED") {
      stats.completedTrips = count;
    }

    if (item.status === "CANCELLED") {
      stats.cancelledTrips = count;
    }

    if (item.status === "ACCEPTED") {
      stats.acceptedTrips = count;
    }

    if (item.status === "ARRIVED") {
      stats.arrivedTrips = count;
    }

    if (item.status === "STARTED") {
      stats.startedTrips = count;
    }
  }

  return stats;
};

/**
 * Get all documents for a driver.
 */
const findDriverDocuments = async (driverId) => {
  return prisma.driverDocument.findMany({
    where: {
      driverId,
    },

    select: {
      id: true,
      driverId: true,
      documentType: true,
      documentNumber: true,
      fileUrl: true,
      filePublicId: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

/**
 * Get a single driver document.
 */
const findDriverDocumentById = async (documentId) => {
  return prisma.driverDocument.findUnique({
    where: {
      id: documentId,
    },

    select: {
      id: true,
      driverId: true,
      documentType: true,
      documentNumber: true,
      fileUrl: true,
      filePublicId: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Update driver document status with audit log.
 */
const updateDriverDocumentStatusWithAudit = async ({
  documentId,
  status,
  rejectionReason,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const document = await tx.driverDocument.update({
      where: {
        id: documentId,
      },

      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },

      select: {
        id: true,
        driverId: true,
        documentType: true,
        documentNumber: true,
        fileUrl: true,
        filePublicId: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return document;
  });
};

/**
 * Get driver wallet summary.
 */
const findDriverWallet = async (driverId) => {
  return prisma.driverWallet.findUnique({
    where: {
      driverId,
    },

    select: {
      id: true,
      driverId: true,
      balance: true,
      totalEarnings: true,
      totalWithdrawn: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Get driver wallet transactions.
 */
const findDriverWalletTransactions = async ({
  driverId,
  page = 1,
  limit = 20,
}) => {
  const skip = (page - 1) * limit;

  const wallet = await prisma.driverWallet.findUnique({
    where: {
      driverId,
    },

    select: {
      id: true,
    },
  });

  if (!wallet) {
    return null;
  }

  const where = {
    walletId: wallet.id,
  };

  const [transactions, total] = await prisma.$transaction([
    prisma.driverWalletTransaction.findMany({
      where,
      skip,
      take: limit,

      select: {
        id: true,
        walletId: true,
        type: true,
        status: true,
        amount: true,
        referenceType: true,
        referenceId: true,
        description: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.driverWalletTransaction.count({
      where,
    }),
  ]);

  return {
    transactions,
    total,
  };
};

module.exports = {
  findDrivers,
  findPendingDrivers,
  findDriverById,
  findDriverVehicle,
  findDriverTrips,
  findDriverRatings,
  findDriverEarnings,
  findDriverKyc,
  findDriverApprovalEligibility,
  updateDriverStatusWithAudit,
  findDriverStatistics,

  findDriverDocuments,
  findDriverDocumentById,
  updateDriverDocumentStatusWithAudit,
  findDriverWallet,
  findDriverWalletTransactions,
};
