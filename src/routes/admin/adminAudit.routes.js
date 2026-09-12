const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");

const {
  getAuditLogsController,
  exportAuditLogsController,
  getAuditLogController,
  getEntityAuditLogsController,
  getLoginHistoryController,
  getLoginHistoryByIdController,
  getFailedLoginHistoryController,
  getLockedLoginHistoryController,
} = require("../../controllers/admin/adminAudit.controller");

const {
  auditLogQuerySchema,
  auditLogIdParamSchema,
  auditEntityParamsSchema,
  auditEntityQuerySchema,
  loginHistoryQuerySchema,
  loginHistoryIdParamSchema,
  auditExportQuerySchema,
} = require("../../validators/admin/adminAudit.validator");

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieve paginated immutable administrative audit logs with filtering and sorting.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: search
 *         description: Search by admin ID, entity ID, IP address, or admin name/email/phone.
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, SUSPEND, ACTIVATE, CANCEL, REFUND, BLOCK, ASSIGN, REASSIGN, FORCE_COMPLETE]
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *           enum: [USER, DRIVER, VEHICLE, RIDE, PAYMENT, COUPON, PRICING, NOTIFICATION, SETTINGS, ADMIN]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires audit_log:view permission.
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(auditLogQuerySchema),
  getAuditLogsController,
);

/**
 * @swagger
 * /api/admin/audit-logs/{id}:
 *   get:
 *     summary: Get audit log details
 *     description: Retrieve a single audit log record. Sensitive metadata values are redacted.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log fetched successfully.
 *       400:
 *         description: Invalid audit log ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Audit log not found.
 */

/**
 * @swagger
 * /api/admin/audit-logs/export:
 *   get:
 *     summary: Export audit logs as CSV
 *     description: Export filtered administrative audit logs as a secure CSV file.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Search by admin ID, entity ID, IP address, or admin name/email/phone.
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Audit logs CSV export.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires audit_log:export permission.
 */
router.get(
  "/export",
  adminAuthMiddleware,
  requirePermission("audit_log:export"),
  validate(auditExportQuerySchema),
  exportAuditLogsController,
);

/**
 * @swagger
 * /api/admin/audit-logs/entity/{entity}/{entityId}:
 *   get:
 *     summary: Get audit logs for an entity
 *     description: Retrieve audit history associated with a specific entity record.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *           enum: [USER, DRIVER, VEHICLE, RIDE, PAYMENT, COUPON, PRICING, NOTIFICATION, SETTINGS, ADMIN]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Entity audit logs fetched successfully.
 *       400:
 *         description: Invalid entity or entity ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/entity/:entity/:entityId",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(auditEntityParamsSchema),
  validate(auditEntityQuerySchema),
  getEntityAuditLogsController,
);

/**
 * @swagger
 * /api/admin/audit-logs/login-history:
 *   get:
 *     summary: Get admin login history
 *     description: Retrieve paginated administrator authentication history including successful, failed, locked, and logout events.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED, LOCKED, LOGOUT]
 *       - in: query
 *         name: ipAddress
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Login history fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/login-history",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(loginHistoryQuerySchema),
  getLoginHistoryController,
);

/**
 * @swagger
 * /api/admin/audit-logs/login-history/failed:
 *   get:
 *     summary: Get failed login history
 *     description: Retrieve failed administrator login attempts with filtering, pagination, and sorting.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Failed login history fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/login-history/failed",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(loginHistoryQuerySchema),
  getFailedLoginHistoryController,
);

/**
 * @swagger
 * /api/admin/audit-logs/login-history/locked:
 *   get:
 *     summary: Get locked login history
 *     description: Retrieve administrator login events that resulted in or represented an account lock.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Locked login history fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/login-history/locked",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(loginHistoryQuerySchema),
  getLockedLoginHistoryController,
);

/**
 * @swagger
 * /api/admin/audit-logs/login-history/{id}:
 *   get:
 *     summary: Get login history details
 *     description: Retrieve a single administrator login history record.
 *     tags:
 *       - Admin Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Login history record fetched successfully.
 *       400:
 *         description: Invalid ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Login history record not found.
 */
router.get(
  "/login-history/:id",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(loginHistoryIdParamSchema),
  getLoginHistoryByIdController,
);

router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("audit_log:view"),
  validate(auditLogIdParamSchema),
  getAuditLogController,
);

module.exports = router;







