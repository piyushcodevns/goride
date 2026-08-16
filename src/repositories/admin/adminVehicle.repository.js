const prisma = require("../../config/prisma");

/**
 * Get paginated vehicles with search and vehicle type filter.
 */
const findVehicles = async ({
  page = 1,
  limit = 20,
  search,
  vehicleType,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const where = {};

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }

  if (search) {
    where.OR = [
      {
        vehicleNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        brand: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        model: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        color: {
          contains: search,
          mode: "insensitive",
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

  const [vehicles, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,

      select: {
        id: true,
        driverId: true,
        vehicleNumber: true,
        vehicleType: true,
        brand: true,
        model: true,
        color: true,
        seats: true,
        createdAt: true,
        updatedAt: true,

        driver: {
          select: {
            id: true,
            userId: true,
            licenseNumber: true,
            status: true,
            availability: true,

            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                profileImage: true,
                isVerified: true,
                isActive: true,
              },
            },
          },
        },
      },

      orderBy: {
        [sortBy]: sortOrder,
      },
    }),

    prisma.vehicle.count({
      where,
    }),
  ]);

  return {
    vehicles,
    total,
  };
};

/**
 * Get vehicle details by ID.
 */
const findVehicleById = async (vehicleId) => {
  return prisma.vehicle.findUnique({
    where: {
      id: vehicleId,
    },

    select: {
      id: true,
      driverId: true,
      vehicleNumber: true,
      vehicleType: true,
      brand: true,
      model: true,
      color: true,
      seats: true,
      createdAt: true,
      updatedAt: true,

      driver: {
        select: {
          id: true,
          userId: true,
          licenseNumber: true,
          status: true,
          availability: true,
          experience: true,
          averageRating: true,
          totalRatings: true,

          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              gender: true,
              profileImage: true,
              isVerified: true,
              emailVerified: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Find vehicle by vehicle number.
 */
const findVehicleByNumber = async (vehicleNumber) => {
  return prisma.vehicle.findUnique({
    where: {
      vehicleNumber,
    },
    select: {
      id: true,
    },
  });
};

/**
 * Update vehicle with audit log atomically.
 */
const updateVehicleWithAudit = async ({
  vehicleId,
  data,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },

      data,

      select: {
        id: true,
        driverId: true,
        vehicleNumber: true,
        vehicleType: true,
        brand: true,
        model: true,
        color: true,
        seats: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return vehicle;
  });
};

/**
 * Delete vehicle with audit log atomically.
 */
const deleteVehicleWithAudit = async ({
  vehicleId,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.delete({
      where: {
        id: vehicleId,
      },

      select: {
        id: true,
        driverId: true,
        vehicleNumber: true,
        vehicleType: true,
        brand: true,
        model: true,
        color: true,
        seats: true,
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return vehicle;
  });
};

module.exports = {
  findVehicles,
  findVehicleById,
  findVehicleByNumber,
  updateVehicleWithAudit,
  deleteVehicleWithAudit,
};