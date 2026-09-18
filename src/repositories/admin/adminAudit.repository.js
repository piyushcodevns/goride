const prisma = require("../../config/prisma");

/**
 * Build the shared AuditLog WHERE clause.
 * Only repository-level DB filtering belongs here.
 */
const buildAuditWhere = ({
  search,
  adminId,
  action,
  entity,
  entityId,
  ipAddress,
  startDate,
  endDate,
} = {}) => {
  const where = {};

  if (adminId) where.adminId = adminId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (ipAddress) where.ipAddress = ipAddress;

  if (search) {
    where.OR = [
      {
        adminId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        entityId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        ipAddress: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        admin: {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        admin: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        admin: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};

    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  return where;
};

/**
 * Get paginated audit logs.
 */
const findAuditLogs = async ({
  search,
  adminId,
  action,
  entity,
  entityId,
  ipAddress,
  startDate,
  endDate,
  skip = 0,
  take = 50,
  sortOrder = "desc",
} = {}) => {
  const where = buildAuditWhere({
    search,
    adminId,
    action,
    entity,
    entityId,
    ipAddress,
    startDate,
    endDate,
  });

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: sortOrder,
      },
      skip,
      take,
    }),
    prisma.auditLog.count({
      where,
    }),
  ]);

  return {
    logs,
    total,
  };
};

/**
 * Get a single audit log.
 */
const findAuditLogById = async (id) => {
  return prisma.auditLog.findUnique({
    where: { id },
  });
};

/**
 * Get audit logs for a specific entity.
 */
const findAuditLogsByEntity = async ({
  entity,
  entityId,
  sortOrder = "desc",
} = {}) => {
  return prisma.auditLog.findMany({
    where: {
      entity,
      entityId,
    },
    orderBy: {
      createdAt: sortOrder,
    },
  });
};

/**
 * Get paginated admin login history.
 */
const findLoginHistory = async ({
  userId,
  email,
  status,
  ipAddress,
  startDate,
  endDate,
  skip = 0,
  take = 50,
  sortOrder = "desc",
} = {}) => {
  const where = {};

  if (userId) where.userId = userId;
  if (email) {
    where.email = {
      contains: email,
      mode: "insensitive",
    };
  }
  if (status) where.status = status;
  if (ipAddress) where.ipAddress = ipAddress;

  if (startDate || endDate) {
    where.createdAt = {};

    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const [logs, total] = await prisma.$transaction([
    prisma.adminLoginHistory.findMany({
      where,
      orderBy: {
        createdAt: sortOrder,
      },
      skip,
      take,
    }),
    prisma.adminLoginHistory.count({
      where,
    }),
  ]);

  return {
    logs,
    total,
  };
};

/**
 * Get one admin login-history record.
 */
const findLoginHistoryById = async (id) => {
  return prisma.adminLoginHistory.findUnique({
    where: { id },
  });
};

module.exports = {
  buildAuditWhere,
  findAuditLogs,
  findAuditLogById,
  findAuditLogsByEntity,
  findLoginHistory,
  findLoginHistoryById,
};



