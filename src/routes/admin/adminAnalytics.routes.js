const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");

const {
  getGrowth,
  getUserGrowth,
  getDriverGrowth,
  getRevenueGrowth,
  getRideGrowth,
  getVehicleAnalytics,
  getHeatmap,
  getRetention,
  getCityAnalytics,
  exportAnalytics,
} = require("../../controllers/admin/adminAnalytics.controller");

const {
  growthAnalyticsQuerySchema,
  timeSeriesAnalyticsQuerySchema,
  vehicleAnalyticsQuerySchema,
  heatmapAnalyticsQuerySchema,
  retentionAnalyticsQuerySchema,
  cityAnalyticsQuerySchema,
  analyticsExportQuerySchema,
} = require("../../validators/admin/adminAnalytics.validator");

/**
 * @swagger
 * /api/admin/analytics/growth:
 *   get:
 *     summary: Get overall growth comparison analytics
 *     description: Compare users, drivers, successful revenue, and rides for the selected period against the immediately preceding equivalent period.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of analytics period.
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of analytics period.
 *     responses:
 *       200:
 *         description: Growth analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/growth",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(growthAnalyticsQuerySchema),
  getGrowth,
);

/**
 * @swagger
 * /api/admin/analytics/users:
 *   get:
 *     summary: Get user growth analytics
 *     description: Retrieve actual USER registration growth grouped by daily, weekly, or monthly periods.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: User growth analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/users",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(timeSeriesAnalyticsQuerySchema),
  getUserGrowth,
);

/**
 * @swagger
 * /api/admin/analytics/drivers:
 *   get:
 *     summary: Get driver growth analytics
 *     description: Retrieve actual driver registration growth grouped by daily, weekly, or monthly periods.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Driver growth analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/drivers",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(timeSeriesAnalyticsQuerySchema),
  getDriverGrowth,
);

/**
 * @swagger
 * /api/admin/analytics/revenue:
 *   get:
 *     summary: Get revenue growth analytics
 *     description: Retrieve successful payment revenue and transaction trends grouped by daily, weekly, or monthly periods. Revenue is calculated only from Payment records with SUCCESS status.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Revenue growth analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/revenue",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(timeSeriesAnalyticsQuerySchema),
  getRevenueGrowth,
);

/**
 * @swagger
 * /api/admin/analytics/rides:
 *   get:
 *     summary: Get ride growth analytics
 *     description: Retrieve ride volume, completed rides, cancelled rides, completion rate, cancellation rate, total distance, and total duration trends.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Ride growth analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/rides",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(timeSeriesAnalyticsQuerySchema),
  getRideGrowth,
);

/**
 * @swagger
 * /api/admin/analytics/vehicles:
 *   get:
 *     summary: Get vehicle analytics
 *     description: Retrieve ride utilization and average distance/duration by actual ride vehicle type.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Vehicle analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/vehicles",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(vehicleAnalyticsQuerySchema),
  getVehicleAnalytics,
);

/**
 * @swagger
 * /api/admin/analytics/heatmap:
 *   get:
 *     summary: Get ride coordinate heatmap data
 *     description: Retrieve actual stored pickup or destination coordinates from rides for geographic heatmap visualization.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pickup, destination]
 *           default: pickup
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           default: 10000
 *     responses:
 *       200:
 *         description: Heatmap data fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/heatmap",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(heatmapAnalyticsQuerySchema),
  getHeatmap,
);

/**
 * @swagger
 * /api/admin/analytics/retention:
 *   get:
 *     summary: Get user retention analytics
 *     description: Retrieve registration cohorts and ride-based month 0, month 1, and month 2 retention metrics derived from actual user and ride history.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Retention analytics fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/retention",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(retentionAnalyticsQuerySchema),
  getRetention,
);

/**
 * @swagger
 * /api/admin/analytics/cities:
 *   get:
 *     summary: Get city analytics
 *     description: Retrieve city-level analytics only when a reliable structured city relation is available in the underlying ride data. The endpoint does not fabricate city information from coordinates or free-form text.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: City analytics status/data fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:view permission.
 */
router.get(
  "/cities",
  adminAuthMiddleware,
  requirePermission("analytics:view"),
  validate(cityAnalyticsQuerySchema),
  getCityAnalytics,
);

/**
 * @swagger
 * /api/admin/analytics/export:
 *   get:
 *     summary: Export analytics as CSV
 *     description: Export validated Analytics data as CSV. Requires the dedicated analytics:export permission.
 *     tags:
 *       - Admin Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - growth
 *             - users
 *             - drivers
 *             - revenue
 *             - rides
 *             - vehicles
 *             - heatmap
 *             - retention
 *             - cities
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum:
 *             - daily
 *             - weekly
 *             - monthly
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *     responses:
 *       200:
 *         description: Analytics CSV export generated successfully.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires analytics:export permission.
 */
router.get(
  "/export",
  adminAuthMiddleware,
  requirePermission("analytics:export"),
  validate(analyticsExportQuerySchema),
  exportAnalytics,
);

module.exports = router;

