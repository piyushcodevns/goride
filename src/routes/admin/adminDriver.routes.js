const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const {
  getAllDrivers,
  getPending,
  getDriver,
  getVehicle,
  getTrips,
  getRatings,
  getKyc,
  getEarnings,
  getStatistics,
  approve,
  reject,
  suspend,
  activate,

  getDocuments,
  approveDocument,
  rejectDocument,
  getWallet,
  getWalletTransactions,
} = require("../../controllers/admin/adminDriver.controller");

// =====================================================
// DRIVER LIST & DETAILS
// =====================================================

/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     summary: Get all drivers
 *     description: Get paginated drivers with search and filter support.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of drivers per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search drivers using supported driver fields.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter drivers by status.
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [OFFLINE, AVAILABLE, BUSY]
 *         description: Filter drivers by availability.
 *     responses:
 *       200:
 *         description: Drivers fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getAllDrivers,
);

/**
 * @swagger
 * /api/admin/drivers/pending:
 *   get:
 *     summary: Get pending drivers
 *     description: Get paginated drivers waiting for approval.
 *     tags:
 *       - Admin Driver Management
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Pending drivers fetched successfully.
 *       400:
 *         description: Invalid pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/pending",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getPending,
);

/**
 * @swagger
 * /api/admin/drivers/{id}:
 *   get:
 *     summary: Get driver details
 *     description: Get detailed information about a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver details fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getDriver,
);

// =====================================================
// DRIVER INFORMATION
// =====================================================

/**
 * @swagger
 * /api/admin/drivers/{id}/vehicle:
 *   get:
 *     summary: Get driver vehicle
 *     description: Get vehicle information associated with a driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver vehicle fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver or vehicle not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/vehicle",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getVehicle,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/trips:
 *   get:
 *     summary: Get driver trip history
 *     description: Get paginated ride history for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Driver trip history fetched successfully.
 *       400:
 *         description: Invalid driver ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/trips",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getTrips,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/ratings:
 *   get:
 *     summary: Get driver ratings
 *     description: Get paginated ratings and reviews for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Driver ratings fetched successfully.
 *       400:
 *         description: Invalid driver ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/ratings",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getRatings,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/kyc:
 *   get:
 *     summary: Get driver KYC information
 *     description: Get KYC information for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver KYC fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver or KYC information not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/kyc",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getKyc,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/statistics:
 *   get:
 *     summary: Get driver statistics
 *     description: Get aggregated statistics for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver statistics fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/statistics",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getStatistics,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/earnings:
 *   get:
 *     summary: Get driver earnings
 *     description: Get earnings information for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver earnings fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/earnings",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getEarnings,
);

// =====================================================
// DRIVER DOCUMENTS
// =====================================================

/**
 * @swagger
 * /api/admin/drivers/{id}/documents:
 *   get:
 *     summary: Get driver documents
 *     description: Get all uploaded documents for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver documents fetched successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/documents",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getDocuments,
);

/**
 * @swagger
 * /api/admin/drivers/documents/{id}/approve:
 *   patch:
 *     summary: Approve driver document
 *     description: Approve a pending driver document.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver document ID.
 *     responses:
 *       200:
 *         description: Driver document approved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver document not found.
 *       409:
 *         description: Driver document is already approved.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/documents/:id/approve",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  approveDocument,
);

/**
 * @swagger
 * /api/admin/drivers/documents/{id}/reject:
 *   patch:
 *     summary: Reject driver document
 *     description: Reject a driver document with a rejection reason.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver document ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Document is invalid or expired.
 *     responses:
 *       200:
 *         description: Driver document rejected successfully.
 *       400:
 *         description: Invalid rejection reason.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver document not found.
 *       409:
 *         description: Driver document is already rejected.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/documents/:id/reject",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  rejectDocument,
);

// =====================================================
// DRIVER WALLET
// =====================================================

/**
 * @swagger
 * /api/admin/drivers/{id}/wallet:
 *   get:
 *     summary: Get driver wallet
 *     description: Get wallet balance and earnings summary for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver wallet fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver or wallet not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/wallet",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getWallet,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/wallet/transactions:
 *   get:
 *     summary: Get driver wallet transactions
 *     description: Get wallet transaction history for a specific driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of transactions per page.
 *     responses:
 *       200:
 *         description: Driver wallet transactions fetched successfully.
 *       400:
 *         description: Invalid driver ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver view permission required.
 *       404:
 *         description: Driver or wallet not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/wallet/transactions",
  adminAuthMiddleware,
  requirePermission("driver:view"),
  getWalletTransactions,
);

// =====================================================
// DRIVER STATUS MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/drivers/{id}/approve:
 *   patch:
 *     summary: Approve driver
 *     description: Approve a pending driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver approved successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver not found.
 *       409:
 *         description: Driver cannot be approved in the current state.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/approve",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  approve,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/reject:
 *   patch:
 *     summary: Reject driver
 *     description: Reject a driver application with a reason.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Required driver documents are invalid.
 *     responses:
 *       200:
 *         description: Driver rejected successfully.
 *       400:
 *         description: Invalid driver ID or rejection reason.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver not found.
 *       409:
 *         description: Driver cannot be rejected in the current state.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/reject",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  reject,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/suspend:
 *   patch:
 *     summary: Suspend driver
 *     description: Suspend an approved driver with a reason.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Driver violated platform safety policy.
 *     responses:
 *       200:
 *         description: Driver suspended successfully.
 *       400:
 *         description: Invalid driver ID or suspension reason.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver not found.
 *       409:
 *         description: Only an approved driver can be suspended.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/suspend",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  suspend,
);

/**
 * @swagger
 * /api/admin/drivers/{id}/activate:
 *   patch:
 *     summary: Activate driver
 *     description: Activate a suspended driver.
 *     tags:
 *       - Admin Driver Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID.
 *     responses:
 *       200:
 *         description: Driver activated successfully.
 *       400:
 *         description: Invalid driver ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Driver management permission required.
 *       404:
 *         description: Driver not found.
 *       409:
 *         description: Driver cannot be activated in the current state.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/activate",
  adminAuthMiddleware,
  requirePermission("driver:manage"),
  activate,
);

module.exports = router;
