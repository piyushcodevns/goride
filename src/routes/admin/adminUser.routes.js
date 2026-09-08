const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const {
  getAllUsers,
  exportUsers,
  getUser,
  getRideHistory,
  getPaymentHistory,
  getCouponHistory,
  getNotifications,
  activate,
  suspend,
  block,
  deleteUserController,
} = require("../../controllers/admin/adminUser.controller");

// =====================================================
// USER LIST & DETAILS
// =====================================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Get paginated users with search and filter support.
 *     tags:
 *       - Admin User Management
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
 *         description: Number of users per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by supported user fields.
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter users by active status.
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter users by verification status.
 *       - in: query
 *         name: emailVerified
 *         schema:
 *           type: boolean
 *         description: Filter users by email verification status.
 *     responses:
 *       200:
 *         description: Users fetched successfully.
 *       401:
 *         description: Unauthorized. Missing or invalid admin token.
 *       403:
 *         description: Forbidden. User view permission required.
 *       400:
 *         description: Invalid query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getAllUsers,
);

/**
 * @swagger
 * /api/admin/users/export:
 *   get:
 *     summary: Export users as CSV
 *     description: Export all users matching the supported list filters and sorting.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file containing matching users.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 */
router.get(
  "/export",
  adminAuthMiddleware,
  requirePermission("user:export"),
  exportUsers,
);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     description: Get detailed information about a specific user.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *         example: clxxxxxxxxxxxxx
 *     responses:
 *       200:
 *         description: User details fetched successfully.
 *       400:
 *         description: Invalid user ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getUser,
);

// =====================================================
// USER HISTORY
// =====================================================

/**
 * @swagger
 * /api/admin/users/{id}/rides:
 *   get:
 *     summary: Get user ride history
 *     description: Get paginated ride history of a specific user.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
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
 *         description: User ride history fetched successfully.
 *       400:
 *         description: Invalid user ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/rides",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getRideHistory,
);

/**
 * @swagger
 * /api/admin/users/{id}/payments:
 *   get:
 *     summary: Get user payment history
 *     description: Get paginated payment history of a specific user.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
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
 *         description: User payment history fetched successfully.
 *       400:
 *         description: Invalid user ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/payments",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getPaymentHistory,
);

/**
 * @swagger
 * /api/admin/users/{id}/coupons:
 *   get:
 *     summary: Get user coupon history
 *     description: Get paginated coupon usage history of a specific user.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
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
 *         description: User coupon history fetched successfully.
 *       400:
 *         description: Invalid user ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/coupons",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getCouponHistory,
);

/**
 * @swagger
 * /api/admin/users/{id}/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Get paginated notifications for a specific user.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
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
 *         description: User notifications fetched successfully.
 *       400:
 *         description: Invalid user ID or pagination parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User view permission required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/notifications",
  adminAuthMiddleware,
  requirePermission("user:view"),
  getNotifications,
);

// =====================================================
// USER STATUS MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     description: Activate a suspended or inactive user account.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *     responses:
 *       200:
 *         description: User activated successfully.
 *       400:
 *         description: Invalid user ID or invalid user state.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User management permission required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: User cannot be activated in the current state.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/activate",
  adminAuthMiddleware,
  requirePermission("user:manage"),
  activate,
);

/**
 * @swagger
 * /api/admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend user
 *     description: Suspend a user account.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *     responses:
 *       200:
 *         description: User suspended successfully.
 *       400:
 *         description: Invalid user ID or invalid user state.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User management permission required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: User cannot be suspended in the current state.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/suspend",
  adminAuthMiddleware,
  requirePermission("user:manage"),
  suspend,
);

/**
 * @swagger
 * /api/admin/users/{id}/block:
 *   patch:
 *     summary: Block user
 *     description: Block a user account. Blocked users cannot log in.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *     responses:
 *       200:
 *         description: User blocked successfully.
 *       400:
 *         description: Invalid user ID or invalid user state.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User management permission required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: User is already blocked or deleted.
 *       500:
 *         description: Internal server error.
 */
router.patch(
  "/:id/block",
  adminAuthMiddleware,
  requirePermission("user:manage"),
  block,
);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: Soft delete a user account. Sets deletedAt timestamp and deactivates the account. Data is preserved.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       400:
 *         description: Invalid user ID or invalid user state.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. User management permission required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: User is already deleted.
 *       500:
 *         description: Internal server error.
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  requirePermission("user:delete"),
  deleteUserController,
);

module.exports = router;

