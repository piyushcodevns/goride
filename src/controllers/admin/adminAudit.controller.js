const {
  getAuditLogs,
  exportAuditLogsCsv,
  getAuditLogById,
  getAuditLogsByEntity,
  getLoginHistory,
  getLoginHistoryById,
  getFailedLoginHistory,
  getLockedLoginHistory,
} = require("../../services/admin/adminAudit.service");

/**
 * Get paginated audit logs.
 */

const exportAuditLogsController = async (req, res, next) => {
  try {
    const csv = await exportAuditLogsCsv(req.query);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="goride-audit-logs.csv"',
    );

    return res.send(csv);
  } catch (error) {
    return next(error);
  }
};
const getAuditLogsController = async (req, res, next) => {
  try {
    const result = await getAuditLogs(req.query);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get one audit log.
 */
const getAuditLogController = async (req, res, next) => {
  try {
    const result = await getAuditLogById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Audit log fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit logs for a specific entity.
 */
const getEntityAuditLogsController = async (req, res, next) => {
  try {
    const result = await getAuditLogsByEntity({
      entity: req.params.entity,
      entityId: req.params.entityId,
      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Entity audit logs fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin login history.
 */
const getLoginHistoryController = async (req, res, next) => {
  try {
    const result = await getLoginHistory(req.query);

    return res.status(200).json({
      success: true,
      message: "Admin login history fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get one login-history record.
 */
const getLoginHistoryByIdController = async (req, res, next) => {
  try {
    const result = await getLoginHistoryById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Login history record fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get failed login attempts.
 */
const getFailedLoginHistoryController = async (req, res, next) => {
  try {
    const result = await getFailedLoginHistory(req.query);

    return res.status(200).json({
      success: true,
      message: "Failed login history fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get locked-account login events.
 */
const getLockedLoginHistoryController = async (req, res, next) => {
  try {
    const result = await getLockedLoginHistory(req.query);

    return res.status(200).json({
      success: true,
      message: "Locked login history fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogsController,
  exportAuditLogsController,
  getAuditLogController,
  getEntityAuditLogsController,
  getLoginHistoryController,
  getLoginHistoryByIdController,
  getFailedLoginHistoryController,
  getLockedLoginHistoryController,
};

