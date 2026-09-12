const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/requirePermission.middleware");
const ADMIN_PERMISSIONS = require("../../constants/adminPermissions");

const {
  getSystemStatus,
  getHealthCheck,
  getFailedJobs,
} = require("../../controllers/admin/adminMonitoring.controller");

router.use(adminAuthMiddleware);

/**
 * @swagger
 * /api/admin/monitoring:
 *   get:
 *     summary: Get system monitoring status
 *     tags: [Admin Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System monitoring status
 */
router.get(
  "/",
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_MONITOR),
  getSystemStatus
);

/**
 * @swagger
 * /api/admin/monitoring/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Healthy
 *       503:
 *         description: Unhealthy
 */
router.get(
  "/health",
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_MONITOR),
  getHealthCheck
);

/**
 * @swagger
 * /api/admin/monitoring/failed-jobs:
 *   get:
 *     summary: Get failed queue jobs
 *     tags: [Admin Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Failed jobs
 */
router.get(
  "/failed-jobs",
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_MONITOR),
  getFailedJobs
);

module.exports = router;


