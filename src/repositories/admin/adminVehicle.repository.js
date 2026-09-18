const prisma = require("../../config/prisma");

/**
 * Get paginated vehicles.
 */
const findVehicles = async ({
  page = 1,
  limit = 20,
  search,
  vehicleType,
  category,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const where = {};

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
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
        category: true,
        status: true,
        rejectionReason: true,
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

        documents: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            fileUrl: true,
            filePublicId: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
            updatedAt: true,
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
      category: true,
      status: true,
      rejectionReason: true,
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

      documents: {
        select: {
          id: true,
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
          createdAt: "desc",
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
        category: true,
        status: true,
        rejectionReason: true,
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
 * Approve vehicle with audit log atomically.
 */
const approveVehicleWithAudit = async ({
  vehicleId,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },

      data: {
        status: "APPROVED",
        rejectionReason: null,
      },

      select: {
        id: true,
        driverId: true,
        vehicleNumber: true,
        vehicleType: true,
        category: true,
        status: true,
        rejectionReason: true,
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return vehicle;
  });
};

/**
 * Reject vehicle with audit log atomically.
 */
const rejectVehicleWithAudit = async ({
  vehicleId,
  rejectionReason,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.update({
      where: {
        id: vehicleId,
      },

      data: {
        status: "REJECTED",
        rejectionReason,
      },

      select: {
        id: true,
        driverId: true,
        vehicleNumber: true,
        vehicleType: true,
        category: true,
        status: true,
        rejectionReason: true,
      },
    });

    await tx.auditLog.create({
      data: auditLog,
    });

    return vehicle;
  });
};

/**
 * Get vehicle documents.
 */
const findVehicleDocuments = async (vehicleId) => {
  return prisma.vehicleDocument.findMany({
    where: {
      vehicleId,
    },

    select: {
      id: true,
      vehicleId: true,
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
      createdAt: "desc",
    },
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
        category: true,
        status: true,
        rejectionReason: true,
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

const findVehicleDocumentById = async (documentId) => {
  return prisma.vehicleDocument.findUnique({
    where: { id: documentId },
    include: {
      vehicle: true,
    },
  });
};

const updateVehicleDocumentStatusWithAudit = async ({
  documentId,
  status,
  rejectionReason = null,
  auditLog,
}) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.vehicleDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason,
      },
    });

    if (auditLog) {
      await tx.auditLog.create({
        data: auditLog,
      });
    }

    return updated;
  });
};

module.exports = {
  findVehicles,
  findVehicleById,
  findVehicleByNumber,
  updateVehicleWithAudit,
  approveVehicleWithAudit,
  rejectVehicleWithAudit,
  findVehicleDocuments,
  findVehicleDocumentById,
  updateVehicleDocumentStatusWithAudit,
  deleteVehicleWithAudit,
};
