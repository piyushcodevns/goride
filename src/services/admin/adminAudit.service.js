const {
  findAuditLogs,
  findAuditLogById,
  findAuditLogsByEntity,
  findLoginHistory,
  findLoginHistoryById,
} = require("../../repositories/admin/adminAudit.repository");

const { NotFoundError } = require("../../utils/AppError");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const normalizedPage = Math.max(Number(page) || DEFAULT_PAGE, 1);
  const normalizedLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
  };
};

/**
 * Remove sensitive credential/token values from audit metadata.
 */
const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }

  if (Array.isArray(metadata)) {
    return metadata.map(sanitizeMetadata);
  }

  const sensitiveKeys = new Set([
    "password",
    "currentpassword",
    "newpassword",
    "confirmpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "refreshtokenhash",
    "authorization",
    "cookie",
    "apikey",
    "secret",
    "clientsecret",
    "otp",
    "code",
    "credential",
  ]);

  return Object.entries(metadata).reduce((safeObject, [key, value]) => {
    if (sensitiveKeys.has(key.toLowerCase())) {
      safeObject[key] = "[REDACTED]";
      return safeObject;
    }

    if (value && typeof value === "object") {
      safeObject[key] = sanitizeMetadata(value);
      return safeObject;
    }

    safeObject[key] = value;
    return safeObject;
  }, {});
};

const sanitizeAuditLog = (log) => {
  if (!log) return null;

  return {
    ...log,
    metadata: sanitizeMetadata(log.metadata),
  };
};

const sanitizeLoginHistory = (log) => {
  if (!log) return null;

  return {
    ...log,
    failureReason: log.failureReason || null,
  };
};

const getAuditLogs = async (filters = {}) => {
  const { page, limit, skip } = normalizePagination(
    filters.page,
    filters.limit
  );

  const result = await findAuditLogs({
    search: filters.search,
    adminId: filters.adminId,
    action: filters.action,
    entity: filters.entity,
    entityId: filters.entityId,
    ipAddress: filters.ipAddress,
    startDate: filters.startDate,
    endDate: filters.endDate,
    skip,
    take: limit,
    sortOrder: filters.sortOrder || "desc",
  });

  return {
    data: result.logs.map(sanitizeAuditLog),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

const getAuditLogById = async (id) => {
  const log = await findAuditLogById(id);

  if (!log) {
    throw new NotFoundError("Audit log not found.");
  }

  return sanitizeAuditLog(log);
};

const getAuditLogsByEntity = async ({
  entity,
  entityId,
  sortOrder = "desc",
}) => {
  const logs = await findAuditLogsByEntity({
    entity,
    entityId,
    sortOrder,
  });

  return logs.map(sanitizeAuditLog);
};

const getLoginHistory = async (filters = {}) => {
  const { page, limit, skip } = normalizePagination(
    filters.page,
    filters.limit
  );

  const result = await findLoginHistory({
    userId: filters.userId,
    email: filters.email,
    status: filters.status,
    ipAddress: filters.ipAddress,
    startDate: filters.startDate,
    endDate: filters.endDate,
    skip,
    take: limit,
    sortOrder: filters.sortOrder || "desc",
  });

  return {
    data: result.logs.map(sanitizeLoginHistory),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

const getLoginHistoryById = async (id) => {
  const log = await findLoginHistoryById(id);

  if (!log) {
    throw new NotFoundError("Login history record not found.");
  }

  return sanitizeLoginHistory(log);
};

const getFailedLoginHistory = async (filters = {}) => {
  return getLoginHistory({
    ...filters,
    status: "FAILED",
  });
};

const getLockedLoginHistory = async (filters = {}) => {
  return getLoginHistory({
    ...filters,
    status: "LOCKED",
  });
};

/**
 * Export filtered audit logs as CSV.
 *
 * Security:
 * - Applies the same filters/search as audit listing.
 * - Sanitizes sensitive metadata.
 * - Limits export size to protect server memory.
 * - Does not expose credentials/tokens/secrets.
 */
const exportAuditLogsCsv = async (filters = {}) => {
  const MAX_EXPORT_ROWS = 10000;

  const result = await findAuditLogs({
    search: filters.search,
    adminId: filters.adminId,
    action: filters.action,
    entity: filters.entity,
    entityId: filters.entityId,
    ipAddress: filters.ipAddress,
    startDate: filters.startDate,
    endDate: filters.endDate,
    skip: 0,
    take: MAX_EXPORT_ROWS,
    sortOrder: filters.sortOrder || "desc",
  });

  const escapeCsv = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    let stringValue = String(value);

    // Prevent spreadsheet formula injection.
    if (/^[=+\-@]/.test(stringValue)) {
      stringValue = `'${stringValue}`;
    }

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n") ||
      stringValue.includes("\r")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const headers = [
    "id",
    "adminId",
    "action",
    "entity",
    "entityId",
    "ipAddress",
    "userAgent",
    "createdAt",
    "metadata",
  ];

  const rows = result.logs.map((log) => {
    const safeLog = sanitizeAuditLog(log);

    return headers
      .map((header) => {
        let value = safeLog[header];

        if (header === "metadata" && value !== null && value !== undefined) {
          value = JSON.stringify(value);
        }

        return escapeCsv(value);
      })
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};
module.exports = {
  getAuditLogs,
  exportAuditLogsCsv,
  getAuditLogById,
  getAuditLogsByEntity,
  getLoginHistory,
  getLoginHistoryById,
  getFailedLoginHistory,
  getLockedLoginHistory,
  sanitizeMetadata,
  sanitizeAuditLog,
  sanitizeLoginHistory,
  normalizePagination,
};


