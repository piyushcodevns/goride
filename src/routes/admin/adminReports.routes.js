const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");

const {
  getOverview,
  getRevenue,
  getRides,
  getUsers,
  getDrivers,
  getVehicles,
  getPayments,
  getCoupons,
  getOperations,
} = require("../../controllers/admin/adminReports.controller");

const {
  overviewQuerySchema,
  revenueReportQuerySchema,
  rideReportQuerySchema,
  userReportQuerySchema,
  driverReportQuerySchema,
  vehicleReportQuerySchema,
  paymentReportQuerySchema,
  couponReportQuerySchema,
  operationsReportQuerySchema,
} = require("../../validators/admin/adminReports.validator");

/**
 * @swagger
 * /api/admin/reports/overview:
 *   get:
 *     summary: Get executive overview report
 *     description: Retrieve cross-system high-level KPI summary including revenue, rides, users, drivers, vehicles, payments, and coupons.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Executive overview report fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/overview",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(overviewQuerySchema),
  getOverview,
);

/**
 * @swagger
 * /api/admin/reports/revenue:
 *   get:
 *     summary: Get revenue analytics report
 *     description: Retrieve detailed revenue analytics with date filtering, vehicle type breakdown, city breakdown, and time-series trends.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [BIKE, AUTO, CAR, SUV]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city / pickup area
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation time interval
 *     responses:
 *       200:
 *         description: Revenue report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/revenue",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(revenueReportQuerySchema),
  getRevenue,
);

/**
 * @swagger
 * /api/admin/reports/rides:
 *   get:
 *     summary: Get ride analytics report
 *     description: Retrieve detailed ride statistics, status breakdown, vehicle distribution, cancellation rate, distance/duration averages, and trends.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [REQUESTED, ACCEPTED, ARRIVED, STARTED, COMPLETED, CANCELLED]
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [BIKE, AUTO, CAR, SUV]
 *     responses:
 *       200:
 *         description: Ride report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/rides",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(rideReportQuerySchema),
  getRides,
);

/**
 * @swagger
 * /api/admin/reports/users:
 *   get:
 *     summary: Get user analytics report
 *     description: Retrieve user registration trends, active/inactive counts, verification metrics, and demographic distributions.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: User report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/users",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(userReportQuerySchema),
  getUsers,
);

/**
 * @swagger
 * /api/admin/reports/drivers:
 *   get:
 *     summary: Get driver analytics report
 *     description: Retrieve driver onboarding metrics, status distribution, availability stats, rating distribution, and top-rated drivers.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, SUSPENDED]
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [OFFLINE, AVAILABLE, BUSY]
 *     responses:
 *       200:
 *         description: Driver report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/drivers",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(driverReportQuerySchema),
  getDrivers,
);

/**
 * @swagger
 * /api/admin/reports/vehicles:
 *   get:
 *     summary: Get vehicle analytics report
 *     description: Retrieve vehicle fleet status, type breakdown, category distribution, and ride utilization.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [BIKE, AUTO, CAR, SUV]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ECONOMY, PREMIUM, LUXURY]
 *     responses:
 *       200:
 *         description: Vehicle report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/vehicles",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(vehicleReportQuerySchema),
  getVehicles,
);

/**
 * @swagger
 * /api/admin/reports/payments:
 *   get:
 *     summary: Get payment analytics report
 *     description: Retrieve payment transaction breakdown, status volumes, method breakdown, gateway performance, and volume trends.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED]
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, UPI, CARD, WALLET]
 *     responses:
 *       200:
 *         description: Payment report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/payments",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(paymentReportQuerySchema),
  getPayments,
);

/**
 * @swagger
 * /api/admin/reports/coupons:
 *   get:
 *     summary: Get coupon analytics report
 *     description: Retrieve promotional coupon performance, discount amounts given, top-performing coupons, and redemption trends.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Coupon report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/coupons",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(couponReportQuerySchema),
  getCoupons,
);

/**
 * @swagger
 * /api/admin/reports/operations:
 *   get:
 *     summary: Get operational analytics report
 *     description: Retrieve operational metrics including 24-hour peak hours, city-wise ride/revenue performance, vehicle type distribution, and cancellation rates.
 *     tags:
 *       - Admin Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Operations report fetched successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Requires report:view permission.
 */
router.get(
  "/operations",
  adminAuthMiddleware,
  requirePermission("report:view"),
  validate(operationsReportQuerySchema),
  getOperations,
);

module.exports = router;
