const express = require("express");

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/adminRbac.middleware");

const dashboardController = require("../../controllers/admin/adminDashboard.controller");

const router = express.Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard
 *     tags:
 *       - Admin Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard fetched successfully.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Dashboard permission required.
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("dashboard:view"),
  dashboardController.getDashboard
);

module.exports = router;