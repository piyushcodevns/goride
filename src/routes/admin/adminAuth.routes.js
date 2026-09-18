const express = require("express");

const router = express.Router();

const {
  login,
  createAdminController,
  refreshToken,
  logout,
  changeAdminPasswordController,
  forgotAdminPasswordController,
  resetAdminPasswordController,
  verifyMfaLogin,
  setupMfa,
  confirmMfa,
  disableMfa,
} = require("../../controllers/admin/adminAuth.controller");

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaLoginSchema,
  mfaCodeSchema,
} = require("../../validators/admin/adminAuth.validator");

const { validate } = require("../../middleware/validate.middleware");
const {
  validateAdminBody,
} = require("../../middleware/admin/adminValidate.middleware");

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  mfaLimiter,
} = require("../../middleware/rateLimit.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const ADMIN_PERMISSIONS = require("../../constants/adminPermissions");

// =========================
// ADMIN AUTH ROUTES
// =========================

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate an admin and generate access and refresh tokens.
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@goride.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Admin login successful.
 *       401:
 *         description: Invalid credentials.
 *       403:
 *         description: Admin account is locked or inactive.
 *       500:
 *         description: Internal server error.
 */
router.post("/login", loginLimiter, validateAdminBody(loginSchema), login);

/**
 * @swagger
 * /api/admin/auth/login/mfa:
 *   post:
 *     summary: Complete admin MFA login
 *     tags: [Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mfaToken, code]
 *             properties:
 *               mfaToken: { type: string }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Admin login successful.
 *       401:
 *         description: Invalid or expired MFA challenge/code.
 */
router.post(
  "/login/mfa",
  mfaLimiter,
  validateAdminBody(mfaLoginSchema),
  verifyMfaLogin,
);

/**
 * @swagger
 * /api/admin/auth/create:
 *   post:
 *     summary: Create admin
 *     description: Create a new admin account.
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@goride.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *               fullName:
 *                 type: string
 *                 example: GoRide Admin
 *               role:
 *                 type: string
 *                 example: ADMIN
 *     responses:
 *       201:
 *         description: Admin created successfully.
 *       400:
 *         description: Invalid admin data.
 *       409:
 *         description: Admin already exists.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/create",
  adminAuthMiddleware,
  requirePermission(ADMIN_PERMISSIONS.ADMIN_MANAGE),
  validateAdminBody(registerSchema),
  createAdminController,
);

/**
 * @swagger
 * /api/admin/auth/refresh:
 *   post:
 *     summary: Refresh admin access token
 *     description: Generate a new admin access token using a valid refresh token.
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIs...
 *     responses:
 *       200:
 *         description: Admin token refreshed successfully.
 *       401:
 *         description: Invalid or expired refresh token.
 *       500:
 *         description: Internal server error.
 */
router.post("/refresh", validateAdminBody(refreshTokenSchema), refreshToken);

/**
 * @swagger
 * /api/admin/auth/logout:
 *   post:
 *     summary: Admin logout
 *     description: Logout an authenticated admin session.
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: session_123456
 *     responses:
 *       200:
 *         description: Admin logout successful.
 *       401:
 *         description: Unauthorized. Missing or invalid admin token.
 *       404:
 *         description: Admin session not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/logout",
  adminAuthMiddleware,
  validateAdminBody(logoutSchema),
  logout,
);

/**
 * @swagger
 * /api/admin/auth/change-password:
 *   post:
 *     summary: Change admin password
 *     description: Change the password of the currently authenticated admin.
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: OldPassword@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Admin password changed successfully.
 *       400:
 *         description: Invalid password data.
 *       401:
 *         description: Unauthorized or current password is incorrect.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/change-password",
  adminAuthMiddleware,
  validateAdminBody(changePasswordSchema),
  changeAdminPasswordController,
);
/**
 * @swagger
 * /api/admin/auth/forgot-password:
 *   post:
 *     summary: Request admin password reset
 *     description: Send a password reset request for an admin account.
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@goride.com
 *     responses:
 *       200:
 *         description: Password reset request processed successfully.
 *       400:
 *         description: Invalid email.
 *       404:
 *         description: Admin account not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateAdminBody(forgotPasswordSchema),
  forgotAdminPasswordController,
);

/**
 * @swagger
 * /api/admin/auth/reset-password:
 *   post:
 *     summary: Reset admin password
 *     description: Reset an admin password using a valid reset token.
 *     tags:
 *       - Admin Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 example: reset_token_here
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Admin password reset successfully.
 *       400:
 *         description: Invalid or expired reset token.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/reset-password",
  validateAdminBody(resetPasswordSchema),
  resetAdminPasswordController,
);

/**
 * @swagger
 * /api/admin/auth/2fa/setup:
 *   post:
 *     summary: Generate an admin TOTP secret
 *     tags: [Admin Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: TOTP setup data. The secret is returned only for enrollment.
 */
router.post("/2fa/setup", adminAuthMiddleware, setupMfa);
/**
 * @swagger
 * /api/admin/auth/2fa/confirm:
 *   post:
 *     summary: Enable admin two-factor authentication
 *     tags: [Admin Authentication]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/2fa/confirm",
  adminAuthMiddleware,
  mfaLimiter,
  validateAdminBody(mfaCodeSchema),
  confirmMfa,
);
/**
 * @swagger
 * /api/admin/auth/2fa/disable:
 *   post:
 *     summary: Disable admin two-factor authentication
 *     tags: [Admin Authentication]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/2fa/disable",
  adminAuthMiddleware,
  mfaLimiter,
  validateAdminBody(mfaCodeSchema),
  disableMfa,
);

module.exports = router;
